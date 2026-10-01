package com.emssystem.emsemployeeservice.employee.service;

import com.emssystem.emsemployeeservice.shared.exception.BusinessRuleException;
import com.emssystem.emsemployeeservice.shared.exception.ErrorCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;

@Component
public class EmployeeNumberGenerator {
    private final JdbcTemplate jdbc;

    public EmployeeNumberGenerator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // The row lock lasts until employee creation commits. Rollbacks restore the
    // counter.
    @Transactional(propagation = Propagation.MANDATORY)
    public String next() {
        var numbers = jdbc.queryForList("""
                UPDATE employee_number_counter SET last_number = last_number + 1
                WHERE id = 1 AND last_number < 999999
                RETURNING last_number
                """, Long.class);
        if (numbers.isEmpty()) {
            throw new BusinessRuleException(ErrorCode.BUSINESS_RULE_VIOLATION,
                    "Employee number limit of 999999 has been reached.");
        }
        return String.format(Locale.ROOT, "%06d", numbers.get(0));
    }
}
