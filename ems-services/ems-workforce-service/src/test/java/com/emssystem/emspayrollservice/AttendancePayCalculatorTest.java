package com.emssystem.emspayrollservice;
import com.emssystem.emspayrollservice.payroll.calculation.AttendancePayCalculator;
import static com.emssystem.emspayrollservice.payroll.calculation.AttendancePayCalculator.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.math.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class AttendancePayCalculatorTest {
 private final AttendancePayCalculator calculator=new AttendancePayCalculator();
 private Interval hours(String day,int start,int hours){var a=LocalDate.parse(day).atTime(start,0).atZone(ZONE).toInstant();return new Interval(a,a.plusSeconds(hours*3600L));}
 private List<Interval> week(int days,int hours){var result=new ArrayList<Interval>();for(int i=0;i<days;i++)result.add(hours(LocalDate.of(2026,9,26).plusDays(i).toString(),8,hours));return result;}
 private Total pay(List<Interval> entries){return calculator.calculate(entries,ANCHOR,new BigDecimal("20"));}
 @Test void dailyExcessWinsWithoutDoubleCounting(){var result=pay(week(5,10));assertEquals(40*3600,result.regularSeconds());assertEquals(10*3600,result.overtimeSeconds());assertEquals(new BigDecimal("1100.00"),result.grossPay());}
 @Test void weeklyExcessWins(){var result=pay(week(6,8));assertEquals(44*3600,result.regularSeconds());assertEquals(4*3600,result.overtimeSeconds());}
 @Test void weeklyTopUpExcludesDailyOvertime(){var result=pay(week(7,10));assertEquals(44*3600,result.regularSeconds());assertEquals(26*3600,result.overtimeSeconds());}
 @Test void exactThresholdIsRegular(){var entries=week(5,8);entries.add(hours("2026-10-01",8,4));assertEquals(0,pay(entries).overtimeSeconds());}
 @Test void multipleSessionsShareDailyThreshold(){var result=pay(List.of(hours("2026-09-26",8,4),hours("2026-09-26",13,5)));assertEquals(8*3600,result.regularSeconds());assertEquals(3600,result.overtimeSeconds());}
 @Test void previousWeekHoursDetermineFridayOvertime(){var entries=new ArrayList<Interval>();for(int i=0;i<6;i++)entries.add(hours(LocalDate.of(2026,9,19).plusDays(i).toString(),8,7));entries.add(hours("2026-09-25",8,8));var result=pay(entries);assertEquals(2*3600,result.regularSeconds());assertEquals(6*3600,result.overtimeSeconds());}
 @Test void dailyOvertimeStaysOnItsDayAndWeeklyTopUpUsesLatestHours(){var entries=week(6,8);entries.add(hours("2026-10-02",8,10));var result=pay(entries);assertEquals(44*3600,result.regularSeconds());assertEquals(14*3600,result.overtimeSeconds());}
 @Test void midnightAndPayBoundarySplitWithoutLosingSeconds(){var start=LocalDate.of(2026,10,8).atTime(22,0).atZone(ZONE).toInstant();var entries=List.of(new Interval(start,start.plusSeconds(10*3600)));var first=pay(entries);var second=calculator.calculate(entries,ANCHOR.plusDays(14),BigDecimal.TEN);assertEquals(2*3600,first.regularSeconds());assertEquals(8*3600,second.regularSeconds());assertEquals(0,first.overtimeSeconds()+second.overtimeSeconds());}
 @Test void daylightSavingUsesElapsedTime(){
  // Alberta's last autumn clock change was in 2025; 2026 has no repeated hour.
  for(var pair:List.of(new String[]{"2026-03-08","3"},new String[]{"2025-11-02","5"})){
   var day=LocalDate.parse(pair[0]);var start=day.atStartOfDay(ZONE).toInstant();var end=day.atTime(4,0).atZone(ZONE).toInstant();var result=calculator.calculate(List.of(new Interval(start,end)),periodFor(day),BigDecimal.TEN);assertEquals(Long.parseLong(pair[1])*3600,result.regularSeconds());
  }
 }
 @Test void secondsAreRetainedUntilMoneyRounding(){var start=Instant.parse("2026-09-26T16:00:00Z");var result=pay(List.of(new Interval(start,start.plusSeconds(61))));assertEquals(61,result.regularSeconds());assertEquals(new BigDecimal("0.34"),result.grossPay());}
 @Test void emptyTimeIsZeroAndAnchorWorksBeforeEpoch(){assertEquals(BigDecimal.ZERO.setScale(2),pay(List.of()).grossPay());assertEquals(LocalDate.of(2026,9,11),periodFor(LocalDate.of(2026,9,24)));}
}
