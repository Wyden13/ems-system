package com.emssystem.emsschedulingservice.scheduling.validation;
import java.time.Instant;
public interface ShiftTimeValidator{
    void validate(Instant startsAt,Instant endsAt);
}
