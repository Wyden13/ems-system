package com.emssystem.emsleaveservice.pto.validation; import java.time.LocalDate; public interface PtoConflictValidator{void validate(Long employeeId,LocalDate startDate,LocalDate endDate);}
