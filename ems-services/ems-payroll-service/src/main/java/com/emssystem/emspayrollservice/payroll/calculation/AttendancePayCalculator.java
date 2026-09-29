package com.emssystem.emspayrollservice.payroll.calculation;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.math.*;
import org.springframework.stereotype.Component;
@Component
public class AttendancePayCalculator {
 public static final ZoneId ZONE=ZoneId.of("America/Edmonton");
 public static final LocalDate ANCHOR=LocalDate.of(2026,9,25);
 public record Interval(Instant start,Instant end){}
 public record Total(long regularSeconds,long overtimeSeconds,BigDecimal regularPay,BigDecimal overtimePay,BigDecimal grossPay){}
 private static class Slice {
  final LocalDate date;long regular;long overtime;
  Slice(LocalDate date,long regular,long overtime){this.date=date;this.regular=regular;this.overtime=overtime;}
 }
 public static LocalDate periodFor(LocalDate day){return ANCHOR.plusDays(Math.floorDiv(java.time.temporal.ChronoUnit.DAYS.between(ANCHOR,day),14)*14);}
 public static LocalDate weekStart(LocalDate day){return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.SATURDAY));}
 public static LocalDate coverageEnd(LocalDate periodStart){return weekStart(periodStart.plusDays(13)).plusDays(7);}
 public Total calculate(List<Interval> intervals,LocalDate periodStart,BigDecimal rate){
  if(!periodFor(periodStart).equals(periodStart)||rate.signum()<0)throw new IllegalArgumentException();
  var coverageStart=weekStart(periodStart).atStartOfDay(ZONE).toInstant();
  var coverageEnd=coverageEnd(periodStart).atStartOfDay(ZONE).toInstant();
  Map<LocalDate,List<Slice>> weeks=new TreeMap<>();Map<LocalDate,Long> daily=new HashMap<>();
  for(var interval:intervals.stream().sorted(Comparator.comparing(Interval::start)).toList()){
   if(!interval.end().isAfter(interval.start()))throw new IllegalArgumentException("Invalid attendance interval");
   var start=interval.start().isBefore(coverageStart)?coverageStart:interval.start();
   var end=interval.end().isAfter(coverageEnd)?coverageEnd:interval.end();
   while(start.isBefore(end)){
    var day=start.atZone(ZONE).toLocalDate();var midnight=day.plusDays(1).atStartOfDay(ZONE).toInstant();
    var stop=end.isBefore(midnight)?end:midnight;long seconds=Duration.between(start,stop).getSeconds();
    long used=daily.getOrDefault(day,0L);long regular=Math.min(seconds,Math.max(0,8*3600-used));
    daily.put(day,used+seconds);weeks.computeIfAbsent(weekStart(day),k->new ArrayList<>()).add(new Slice(day,regular,seconds-regular));start=stop;
   }
  }
  long regular=0,overtime=0;
  for(var slices:weeks.values()){
   long total=slices.stream().mapToLong(s->s.regular+s.overtime).sum();
   long dailyOvertime=slices.stream().mapToLong(s->s.overtime).sum();
   long additional=Math.max(0,total-44*3600-dailyOvertime);
   for(int i=slices.size()-1;i>=0 && additional>0;i--){var s=slices.get(i);long move=Math.min(additional,s.regular);s.regular-=move;s.overtime+=move;additional-=move;}
   for(var s:slices)if(!s.date.isBefore(periodStart)&&s.date.isBefore(periodStart.plusDays(14))){regular+=s.regular;overtime+=s.overtime;}
  }
  // Keep full precision until converting the displayed monetary totals to CAD cents.
  var regularAmount=rate.multiply(BigDecimal.valueOf(regular)).divide(BigDecimal.valueOf(3600),12,RoundingMode.HALF_UP);
  var overtimeAmount=rate.multiply(new BigDecimal("1.5")).multiply(BigDecimal.valueOf(overtime)).divide(BigDecimal.valueOf(3600),12,RoundingMode.HALF_UP);
  return new Total(regular,overtime,regularAmount.setScale(2,RoundingMode.HALF_UP),overtimeAmount.setScale(2,RoundingMode.HALF_UP),regularAmount.add(overtimeAmount).setScale(2,RoundingMode.HALF_UP));
 }
}
