package com.emssystem.emsattendanceservice.attendance.service;

import com.emssystem.emsattendanceservice.attendance.dto.request.*;
import com.emssystem.emsattendanceservice.attendance.dto.response.*;
import com.emssystem.emsattendanceservice.attendance.entity.*;
import com.emssystem.emsattendanceservice.attendance.enums.*;
import com.emssystem.emsattendanceservice.attendance.mapper.TimeEntryMapper;
import com.emssystem.emsattendanceservice.attendance.repository.*;
import com.emssystem.emsschedulingservice.shared.grpc.WorkforceClient;
import com.emssystem.emsattendanceservice.shared.security.Caller;
import com.emssystem.contracts.workforce.v1.EmployeeInfo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional
public class AttendanceOperations
        implements ClockService, TimeEntryService, TimeEntryApprovalService, TimesheetService {
    public static final ZoneId ZONE = ZoneId.of("America/Edmonton");
    private final TimeEntryRepository entries;
    private final WorkforceClient workforce;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public AttendanceOperations(TimeEntryRepository entries, WorkforceClient workforce, JdbcTemplate jdbc,
            Clock clock) {
        this.entries = entries;
        this.workforce = workforce;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.SECONDS);
    }

    private void lock(long employee) {
        jdbc.update("insert into attendance_employee_locks(employee_id) values (?) on conflict do nothing", employee);
        jdbc.queryForObject("select employee_id from attendance_employee_locks where employee_id=? for update",
                Long.class, employee);
    }

    public EmployeeInfo mine() {
        return workforce.byAccount(Caller.current().accountId());
    }

    public void canRead(long employeeId) {
        var caller = Caller.current();
        if (caller.manages())
            return;
        var self = mine();
        if (self.getEmployeeId() == employeeId)
            return;
        if (caller.supervises() && self.getDepartmentId() == workforce.byId(employeeId).getDepartmentId())
            return;
        throw error(HttpStatus.FORBIDDEN, "Attendance access denied");
    }

    public record Person(long id, String name, String employeeNumber, boolean active, boolean self) {
    }

    public List<Person> people() {
        var caller = Caller.current();
        List<EmployeeInfo> people = caller.manages() ? workforce.list(0)
                : caller.supervises() ? workforce.list(mine().getDepartmentId()) : List.of(mine());
        return people.stream().map(e -> new Person(e.getEmployeeId(), e.getName(), e.getEmployeeNumber(), e.getActive(),
                e.getAccountId().equals(caller.accountId().toString()))).toList();
    }

    public record ClockedInEmployee(long entryId, long employeeId, String name, String employeeNumber,
            Instant clockIn) {
    }

    public record CurrentAttendance(Instant serverTime, List<ClockedInEmployee> employees) {
    }

    @Transactional(readOnly = true)
    public CurrentAttendance current() {
        var allowed = people().stream().collect(java.util.stream.Collectors.toMap(Person::id, p -> p));
        if (allowed.isEmpty())
            return new CurrentAttendance(now(), List.of());
        var active = entries.findByEmployeeIdInAndStatusAndClockOutIsNullOrderByClockInAsc(allowed.keySet(),
                TimeEntryStatus.OPEN);
        return new CurrentAttendance(now(), active.stream().map(e -> {
            var person = allowed.get(e.getEmployeeId());
            return new ClockedInEmployee(e.getId(), person.id(), person.name(), person.employeeNumber(),
                    e.getClockIn());
        }).toList());
    }

    private void account(UUID id) {
        if (!Caller.current().accountId().equals(id))
            throw error(HttpStatus.FORBIDDEN, "Account mismatch");
    }

    @Override
    public TimeEntryResponse clockIn(UUID user, ClockInRequest request) {
        account(user);
        var employee = mine();
        if (!employee.getActive())
            throw error(HttpStatus.CONFLICT, "This employee is inactive. Contact your administrator.");
        lock(employee.getEmployeeId());
        var previous = entries.findByRequestId(request.requestId());
        if (previous.isPresent()) {
            if (!previous.get().getEmployeeId().equals(employee.getEmployeeId()))
                throw error(HttpStatus.CONFLICT, "Clock request already used");
            return TimeEntryMapper.toResponse(previous.get());
        }
        if (entries.findFirstByEmployeeIdAndStatus(employee.getEmployeeId(), TimeEntryStatus.OPEN).isPresent())
            throw error(HttpStatus.CONFLICT, "Already clocked in. Refresh your attendance.");
        Instant start = now();
        checkOverlap(employee.getEmployeeId(), null, start, null);
        var entry = new TimeEntry(employee.getEmployeeId(), start, ClockSource.WEB);
        entry.identify(request.requestId());
        return TimeEntryMapper.toResponse(entries.saveAndFlush(entry));
    }

    @Override
    public TimeEntryResponse clockOut(UUID user, ClockOutRequest request) {
        account(user);
        var self = mine();
        lock(self.getEmployeeId());
        var entry = find(request.entryId());
        if (entry.getEmployeeId() != self.getEmployeeId())
            throw error(HttpStatus.FORBIDDEN, "Cannot clock out another employee");
        if (entry.getClockOut() != null)
            return TimeEntryMapper.toResponse(entry);
        var end = now();
        if (!end.isAfter(entry.getClockIn()))
            throw error(HttpStatus.CONFLICT, "Wait a second before clocking out");
        entry.close(end);
        return TimeEntryMapper.toResponse(entries.saveAndFlush(entry));
    }

    private TimeEntry find(Long id) {
        return entries.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Time entry not found"));
    }

    private void checkOverlap(long employee, Long excluded, Instant start, Instant end) {
        boolean overlap = entries
                .overlapping(employee, start, end == null ? Instant.parse("9999-12-31T00:00:00Z") : end).stream()
                .anyMatch(e -> !Objects.equals(e.getId(), excluded));
        if (overlap)
            throw error(HttpStatus.CONFLICT, "Time overlaps another attendance entry");
    }

    @Override
    public TimeEntryResponse get(Long id) {
        var entry = find(id);
        canRead(entry.getEmployeeId());
        return TimeEntryMapper.toResponse(entry);
    }

    @Override
    public List<TimeEntryResponse> list(Long employeeId, TimeEntryStatus status, Instant from, Instant to) {
        if (employeeId == null)
            employeeId = mine().getEmployeeId();
        canRead(employeeId);
        range(from, to);
        return entries.overlapping(employeeId, from, to).stream().filter(e -> status == null || status == e.getStatus())
                .map(TimeEntryMapper::toResponse).toList();
    }

    private void range(Instant from, Instant to) {
        if (!to.isAfter(from) || Duration.between(from, to).toDays() > 62)
            throw error(HttpStatus.BAD_REQUEST, "Choose a date range of up to 62 days");
    }

    public long todaySeconds() {
        var self = mine();
        var end = now();
        var start = end.atZone(ZONE).toLocalDate().atStartOfDay(ZONE).toInstant();
        return entries.overlapping(self.getEmployeeId(), start, end.plusSeconds(1)).stream().mapToLong(e -> {
            var a = e.getClockIn().isBefore(start) ? start : e.getClockIn();
            var b = e.getClockOut() == null || e.getClockOut().isAfter(end) ? end : e.getClockOut();
            return Math.max(0, Duration.between(a, b).getSeconds());
        }).sum();
    }

    public TimeEntryResponse active() {
        var e = entries.findFirstByEmployeeIdAndStatus(mine().getEmployeeId(), TimeEntryStatus.OPEN);
        return e.map(TimeEntryMapper::toResponse).orElse(null);
    }

    private TimeEntry reviewEntry(Long id, UUID reviewer, Long version) {
        account(reviewer);
        Caller.current().requireManager();
        // Read identity without attaching a stale entity before the per-employee lock.
        var identities = jdbc.queryForList("select employee_id from time_entries where id=?", Long.class, id);
        Long employeeId = identities.isEmpty() ? null : identities.get(0);
        if (employeeId == null)
            throw error(HttpStatus.NOT_FOUND, "Time entry not found");
        var employee = workforce.byId(employeeId);
        if (employee.getAccountId().equals(reviewer.toString()))
            throw error(HttpStatus.FORBIDDEN, "You cannot review or correct your own attendance");
        lock(employeeId);
        var e = find(id);
        if (!Objects.equals(e.getVersion(), version))
            throw error(HttpStatus.CONFLICT, "This entry changed. Refresh before reviewing.");
        return e;
    }

    private void audit(TimeEntry e, UUID reviewer, String action, String reason, Instant oldIn, Instant oldOut,
            TimeEntryStatus oldStatus) {
        jdbc.update(
                "insert into attendance_audits(entry_id,reviewer,action,reason,old_clock_in,old_clock_out,new_clock_in,new_clock_out,old_status,new_status,occurred_at) values (?,?,?,?,?,?,?,?,?,?,?)",
                e.getId(), reviewer, action, reason == null ? "" : reason, java.sql.Timestamp.from(oldIn),
                oldOut == null ? null : java.sql.Timestamp.from(oldOut), java.sql.Timestamp.from(e.getClockIn()),
                e.getClockOut() == null ? null : java.sql.Timestamp.from(e.getClockOut()), oldStatus.name(),
                e.getStatus().name(), java.sql.Timestamp.from(now()));
    }

    private TimeEntryResponse review(Long id, UUID reviewer, ApproveTimeEntryRequest request, boolean approve) {
        var e = reviewEntry(id, reviewer, request.version());
        if (e.getStatus() != TimeEntryStatus.PENDING_APPROVAL)
            throw error(HttpStatus.CONFLICT, "Only pending entries can be reviewed");
        var old = e.getStatus();
        e.review(approve);
        audit(e, reviewer, approve ? "APPROVE" : "REJECT", request.comment(), e.getClockIn(), e.getClockOut(), old);
        return TimeEntryMapper.toResponse(entries.saveAndFlush(e));
    }

    @Override
    public TimeEntryResponse approve(Long id, UUID user, ApproveTimeEntryRequest r) {
        return review(id, user, r, true);
    }

    @Override
    public TimeEntryResponse reject(Long id, UUID user, ApproveTimeEntryRequest r) {
        return review(id, user, r, false);
    }

    @Override
    public TimeEntryResponse adjust(Long id, UUID user, AdjustTimeEntryRequest r) {
        var e = reviewEntry(id, user, r.version());
        if (!r.clockOut().isAfter(r.clockIn()) || r.clockOut().isAfter(now()))
            throw error(HttpStatus.BAD_REQUEST, "Enter a clock-out after clock-in and no later than now");
        if (r.clockIn().getNano() != 0 || r.clockOut().getNano() != 0)
            throw error(HttpStatus.BAD_REQUEST, "Use whole-second timestamps");
        checkOverlap(e.getEmployeeId(), e.getId(), r.clockIn(), r.clockOut());
        var oldIn = e.getClockIn();
        var oldOut = e.getClockOut();
        var oldStatus = e.getStatus();
        e.correct(r.clockIn(), r.clockOut());
        audit(e, user, "ADJUST", r.reason(), oldIn, oldOut, oldStatus);
        return TimeEntryMapper.toResponse(entries.saveAndFlush(e));
    }

    public List<Map<String, Object>> history(long id) {
        var e = find(id);
        canRead(e.getEmployeeId());
        return jdbc.queryForList(
                "select reviewer,action,reason,old_clock_in,old_clock_out,new_clock_in,new_clock_out,old_status,new_status,occurred_at from attendance_audits where entry_id=? order by id",
                id);
    }

    private int periodMinutes(List<TimeEntryResponse> rows, LocalDate from, LocalDate to) {
        Instant start = from.atStartOfDay(ZONE).toInstant(), end = to.plusDays(1).atStartOfDay(ZONE).toInstant();
        long seconds = rows.stream().filter(e -> e.clockOut() != null).mapToLong(e -> {
            Instant a = e.clockIn().isBefore(start) ? start : e.clockIn(),
                    b = e.clockOut().isAfter(end) ? end : e.clockOut();
            return Math.max(0, Duration.between(a, b).getSeconds());
        }).sum();
        return Math.toIntExact(seconds / 60);
    }

    @Override
    public TimesheetResponse getForAccount(UUID user, LocalDate from, LocalDate to) {
        account(user);
        var self = mine();
        var rows = list(self.getEmployeeId(), null, from.atStartOfDay(ZONE).toInstant(),
                to.plusDays(1).atStartOfDay(ZONE).toInstant());
        return new TimesheetResponse(self.getEmployeeId(), from, to, periodMinutes(rows, from, to), null, rows);
    }

    @Override
    public AttendanceSummaryResponse summary(LocalDate from, LocalDate to) {
        Caller.current().requireManager();
        var rows = people().stream().flatMap(e -> list(e.id(), null, from.atStartOfDay(ZONE).toInstant(),
                to.plusDays(1).atStartOfDay(ZONE).toInstant()).stream()).toList();
        return new AttendanceSummaryResponse(rows.stream().filter(e -> e.status() == TimeEntryStatus.OPEN).count(),
                rows.stream().filter(e -> e.status() == TimeEntryStatus.PENDING_APPROVAL).count(),
                rows.stream().filter(e -> e.status() == TimeEntryStatus.APPROVED).count(),
                rows.stream().filter(e -> e.status() == TimeEntryStatus.REJECTED).count(),
                periodMinutes(rows, from, to), null);
    }
}
