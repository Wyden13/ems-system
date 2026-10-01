package com.emssystem.emsorganizationservice.organization;

import com.emssystem.emsorganizationservice.organization.controller.*;
import com.emssystem.emsorganizationservice.organization.dto.request.*;
import com.emssystem.emsorganizationservice.organization.dto.response.*;
import com.emssystem.emsorganizationservice.organization.exception.*;
import com.emssystem.emsorganizationservice.organization.service.*;
import com.emssystem.emsorganizationservice.shared.exception.*;
import com.emssystem.emsemployeeservice.shared.config.JacksonConfig;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.List;
import java.util.stream.Stream;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({ LocationController.class, DepartmentController.class })
@Import({ com.emssystem.emsemployeeservice.shared.config.StrictRequestTypesConfig.class,
        com.emssystem.emsemployeeservice.shared.config.ClockConfig.class, JacksonConfig.class,
        com.emssystem.emsemployeeservice.shared.security.SecurityConfig.class,
        com.emssystem.emsemployeeservice.shared.security.JwtConfig.class })
@org.springframework.security.test.context.support.WithMockUser(roles = "ADMIN")
class OrganizationApiTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    org.springframework.web.context.WebApplicationContext webContext;

    @org.junit.jupiter.api.BeforeEach
    void securityMvc() {
        mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup(webContext)
                .apply(org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @MockitoBean
    LocationService locations;
    @MockitoBean
    DepartmentService departments;
    private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");
    private static final LocationResponse LOCATION = new LocationResponse(1L, "Calgary", NOW, NOW);
    private static final DepartmentResponse DEPARTMENT = new DepartmentResponse(2L, "Operations", 1L, "Calgary", NOW,
            NOW);

    @Test
    @org.springframework.security.test.context.support.WithAnonymousUser
    void unauthenticatedCallsCannotReachOrganizationData() throws Exception {
        mvc.perform(get("/api/departments")).andExpect(status().isUnauthorized());
        verifyNoInteractions(departments);
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "EMPLOYEE")
    void employeeRoleCannotReadOrganizationData() throws Exception {
        mvc.perform(get("/api/locations")).andExpect(status().isForbidden());
        verifyNoInteractions(locations);
    }

    @Test
    void rejectsInvalidBearerToken() throws Exception {
        mvc.perform(get("/api/locations").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void locationEndpointsReturnExpectedPayloadAndStatus() throws Exception {
        when(locations.create(new CreateLocationRequest("Calgary"))).thenReturn(LOCATION);
        when(locations.get(1L)).thenReturn(LOCATION);
        when(locations.list()).thenReturn(List.of(LOCATION));
        when(locations.replace(1L, new UpdateLocationRequest("Calgary"))).thenReturn(LOCATION);
        mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Calgary\"}"))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/locations/1"))
                .andExpect(jsonPath("$.name").value("Calgary")).andExpect(jsonPath("$.createdAt").exists());
        mvc.perform(get("/api/locations/1")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
        mvc.perform(get("/api/locations")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Calgary"));
        mvc.perform(put("/api/locations/1").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Calgary\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
        mvc.perform(delete("/api/locations/1")).andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(locations).delete(1L);
    }

    @Test
    void departmentEndpointsIncludeLocationAndSupportFiltering() throws Exception {
        when(departments.create(new CreateDepartmentRequest("Operations", 1L))).thenReturn(DEPARTMENT);
        when(departments.get(2L)).thenReturn(DEPARTMENT);
        when(departments.list(null)).thenReturn(List.of(DEPARTMENT));
        when(departments.list(1L)).thenReturn(List.of(DEPARTMENT));
        when(departments.replace(2L, new UpdateDepartmentRequest("Operations", 1L))).thenReturn(DEPARTMENT);
        String body = "{\"name\":\"Operations\",\"locationId\":1}";
        mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/departments/2"))
                .andExpect(jsonPath("$.locationName").value("Calgary"));
        mvc.perform(get("/api/departments/2")).andExpect(status().isOk()).andExpect(jsonPath("$.locationId").value(1));
        mvc.perform(get("/api/departments")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/departments").param("locationId", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].locationId").value(1));
        mvc.perform(put("/api/departments/2").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(2));
        mvc.perform(delete("/api/departments/2")).andExpect(status().isMethodNotAllowed())
                .andExpect(content().string(""));
        verify(departments, never()).delete(2L);
    }

    static Stream<String> invalidNames() {
        return Stream.of("null", "\"\"", "\"   \"", "\"\\t\\n\"", "\"" + "x".repeat(101) + "\"");
    }

    @ParameterizedTest
    @MethodSource("invalidNames")
    void invalidNamesAreRejectedForBothCreateAndReplace(String name) throws Exception {
        String body = "{\"name\":" + name + ",\"locationId\":1}";
        for (String resource : List.of("locations", "departments")) {
            for (MockHttpServletRequestBuilder request : List.of(post("/api/" + resource),
                    put("/api/" + resource + "/1"))) {
                mvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(body))
                        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                        .andExpect(jsonPath("$.errors[*].field", hasItem("name")));
            }
        }
        verifyNoInteractions(locations, departments);
    }

    @ParameterizedTest
    @ValueSource(strings = { "null", "0", "-1" })
    void invalidDepartmentLocationIsRejected(String locationId) throws Exception {
        for (MockHttpServletRequestBuilder request : List.of(post("/api/departments"), put("/api/departments/1"))) {
            mvc.perform(request.contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Operations\",\"locationId\":" + locationId + "}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors[*].field", hasItem("locationId")));
        }
        verifyNoInteractions(departments);
    }

    @ParameterizedTest
    @ValueSource(strings = { "0", "-1", "abc", "9223372036854775808" })
    void invalidPathAndFilterIdsReturnStructuredBadRequest(String id) throws Exception {
        for (String resource : List.of("locations", "departments")) {
            for (MockHttpServletRequestBuilder request : List.of(get("/api/" + resource + "/" + id),
                    delete("/api/" + resource + "/" + id), put("/api/" + resource + "/" + id)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Valid\",\"locationId\":1}"))) {
                mvc.perform(request).andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
            }
        }
        mvc.perform(get("/api/departments").param("locationId", id))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(locations, departments);
    }

    @ParameterizedTest
    @ValueSource(strings = { "", "{", "null", "{}", "{\"name\":\"Valid\",\"locationId\":\"abc\"}" })
    void missingOrMalformedBodyReturnsBadRequest(String body) throws Exception {
        mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(departments);
    }

    @Test
    void maximumNameLengthIsAccepted() throws Exception {
        String name = "x".repeat(100);
        when(locations.create(new CreateLocationRequest(name))).thenReturn(LOCATION);
        when(departments.create(new CreateDepartmentRequest(name, 1L))).thenReturn(DEPARTMENT);
        mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + name + "\",\"locationId\":1}"))
                .andExpect(status().isCreated());
    }

    @Test
    void notFoundUsesCommonErrorFormat() throws Exception {
        when(locations.get(99L)).thenThrow(new LocationNotFoundException(99L));
        when(departments.get(99L)).thenThrow(new DepartmentNotFoundException(99L));
        for (String resource : List.of("locations", "departments")) {
            mvc.perform(get("/api/" + resource + "/99")).andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                    .andExpect(jsonPath("$.path").value("/api/" + resource + "/99"))
                    .andExpect(jsonPath("$.timestamp").exists()).andExpect(jsonPath("$.errors", hasSize(0)));
        }
    }

    @Test
    void missingParentReturnsNotFound() throws Exception {
        when(departments.create(any())).thenThrow(new LocationNotFoundException(99L));
        mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Operations\",\"locationId\":99}"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Location not found: 99"));
    }

    @Test
    void duplicateAndOccupiedLocationReturnConflict() throws Exception {
        when(locations.create(any())).thenThrow(new BusinessRuleException(ErrorCode.CONFLICT, "Duplicate name"));
        doThrow(new BusinessRuleException(ErrorCode.CONFLICT, "Location still has departments: 1"))
                .when(locations).delete(1L);
        mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Calgary\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
        mvc.perform(delete("/api/locations/1")).andExpect(status().isConflict());
    }

    @Test
    void databaseRacesReturnConflictWithoutExposingSql() throws Exception {
        doThrow(new DataIntegrityViolationException("secret SQL constraint details")).when(locations).delete(1L);
        mvc.perform(delete("/api/locations/1")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(content().string(not(containsString("secret SQL"))));
    }

    @Test
    void concurrentUpdateReturnsConflict() throws Exception {
        when(locations.replace(1L, new UpdateLocationRequest("Calgary")))
                .thenThrow(new OptimisticLockingFailureException("stale version"));
        mvc.perform(put("/api/locations/1").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Calgary\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "1.5", "1.0", "\"1\"", "true", "[]", "{}", "9223372036854775808" })
    void locationIdsMustBeJsonIntegers(String locationId) throws Exception {
        mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Operations\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(departments);
    }

    @ParameterizedTest
    @ValueSource(strings = { "123", "1.5", "true", "[]", "{}" })
    void namesMustBeJsonStrings(String name) throws Exception {
        mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":" + name + "}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(locations);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"name\":\"Calgary\",\"name\":\"Edmonton\"}",
            "{\"name\":\"Calgary\"} {\"name\":\"Edmonton\"}"
    })
    void ambiguousJsonIsRejected(String body) throws Exception {
        mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(locations);
    }

    @Test
    void unknownRouteHasSharedErrorFormat() throws Exception {
        mvc.perform(get("/api/unknown")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.path").value("/api/unknown"));
    }

    @Test
    void unsupportedMethodPreservesAllowHeader() throws Exception {
        mvc.perform(patch("/api/locations/1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isMethodNotAllowed()).andExpect(header().exists("Allow"))
                .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    void unsupportedContentTypeHasSharedErrorFormat() throws Exception {
        mvc.perform(post("/api/locations").contentType(MediaType.TEXT_PLAIN).content("Calgary"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("HTTP_ERROR"));
        verifyNoInteractions(locations);
    }

    @Test
    void unexpectedErrorsDoNotExposeImplementationDetails() throws Exception {
        when(locations.list()).thenThrow(new IllegalStateException("private database connection details"));
        mvc.perform(get("/api/locations")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(content().string(not(containsString("private database"))));
    }
}
