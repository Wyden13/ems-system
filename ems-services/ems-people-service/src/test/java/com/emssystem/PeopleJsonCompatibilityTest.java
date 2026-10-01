package com.emssystem;

import com.emssystem.emsemployeeservice.employee.dto.request.CreateEmployeeRequest;
import com.emssystem.emsemployeeservice.shared.config.StrictRequestTypesConfig;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

class PeopleJsonCompatibilityTest {
    @Test
    void decimalStringsRemainCompatibleWithoutCoercingDepartmentIds() {
        var builder = JsonMapper.builder();
        new StrictRequestTypesConfig().strictRequestTypes().customize(builder);
        var mapper = builder.build();
        String body = """
                {"firstName":"Demo","lastName":"Worker","email":"worker@demo.test",
                 "hireDate":"2026-01-01","departmentId":1,"role":"EMPLOYEE","payRate":"25.00"}
                """;
        assertEquals(new java.math.BigDecimal("25.00"), mapper.readValue(body, CreateEmployeeRequest.class).payRate());
        assertThrows(Exception.class, () -> mapper
                .readValue(body.replace("\"departmentId\":1", "\"departmentId\":\"1\""), CreateEmployeeRequest.class));
        assertThrows(Exception.class, () -> mapper.readValue(body.replace("\"departmentId\":1", "\"departmentId\":1.5"),
                CreateEmployeeRequest.class));
    }
}
