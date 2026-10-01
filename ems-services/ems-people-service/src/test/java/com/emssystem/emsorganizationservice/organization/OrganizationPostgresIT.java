package com.emssystem.emsorganizationservice.organization;

import com.emssystem.emsorganizationservice.organization.dto.request.*;
import com.emssystem.emsorganizationservice.organization.entity.Location;
import com.emssystem.emsorganizationservice.organization.exception.*;
import com.emssystem.emsorganizationservice.organization.service.*;
import com.emssystem.emsorganizationservice.shared.exception.BusinessRuleException;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.RollbackException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = com.emssystem.EmsPeopleServiceApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@org.springframework.security.test.context.support.WithMockUser(roles = "ADMIN")
class OrganizationPostgresIT {
    private static final PostgreSQLContainer DATABASE = new PostgreSQLContainer("postgres:18-alpine");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        DATABASE.start();
        registry.add("spring.datasource.url", DATABASE::getJdbcUrl);
        registry.add("spring.datasource.username", DATABASE::getUsername);
        registry.add("spring.datasource.password", DATABASE::getPassword);
    }

    @AfterAll
    static void stopDatabase() {
        DATABASE.stop();
    }

    @Autowired
    LocationService locations;
    @Autowired
    DepartmentService departments;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    EntityManagerFactory entityManagers;
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

    @LocalServerPort
    int port;
    @Autowired
    org.springframework.security.oauth2.jwt.JwtEncoder jwtEncoder;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @BeforeEach
    void clearData() {
        jdbc.update("DELETE FROM departments");
        jdbc.update("DELETE FROM locations");
    }

    @Test
    void migratesSchemaAndPersistsAuditedCrud() {
        assertEquals(6, jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE success AND version IS NOT NULL", Integer.class));
        var created = locations.create(new CreateLocationRequest(" Calgary "));
        assertNotNull(created.id());
        assertNotNull(created.createdAt());
        assertNotNull(created.updatedAt());
        assertEquals("Calgary", locations.get(created.id()).name());
        var replaced = locations.replace(created.id(), new UpdateLocationRequest("Edmonton"));
        assertEquals(created.id(), replaced.id());
        assertEquals(created.createdAt(), replaced.createdAt());
        assertTrue(replaced.updatedAt().isAfter(created.updatedAt()));
        assertEquals(replaced.updatedAt(), locations.get(created.id()).updatedAt());
        assertEquals(1L, jdbc.queryForObject("SELECT version FROM locations WHERE id = ?", Long.class, created.id()));
        locations.delete(created.id());
        assertThrows(LocationNotFoundException.class, () -> locations.get(created.id()));
    }

    @Test
    void caseInsensitiveDuplicatesAreRejectedAndSelfRenameWorks() {
        var location = locations.create(new CreateLocationRequest("Calgary"));
        assertThrows(BusinessRuleException.class, () -> locations.create(new CreateLocationRequest(" CALGARY ")));
        assertEquals("CALGARY", locations.replace(location.id(), new UpdateLocationRequest("CALGARY")).name());
        var other = locations.create(new CreateLocationRequest("Edmonton"));
        assertThrows(BusinessRuleException.class,
                () -> locations.replace(other.id(), new UpdateLocationRequest("calgary")));
        assertEquals("Edmonton", locations.get(other.id()).name());
    }

    @Test
    void departmentsMoveBetweenLocationsAndListsRemainUsableOutsideTransaction() {
        var first = locations.create(new CreateLocationRequest("Calgary"));
        var second = locations.create(new CreateLocationRequest("Edmonton"));
        var department = departments.create(new CreateDepartmentRequest(" Operations ", first.id()));
        var moved = departments.replace(department.id(), new UpdateDepartmentRequest("OPERATIONS", second.id()));
        assertEquals(department.id(), moved.id());
        assertEquals("Edmonton", moved.locationName());
        assertEquals(department.createdAt(), moved.createdAt());
        assertTrue(departments.list(first.id()).isEmpty());
        assertEquals(1, departments.list(second.id()).size());
        assertEquals("Edmonton", departments.list(null).get(0).locationName());
        assertEquals("Edmonton", departments.get(department.id()).locationName());
        locations.delete(first.id());
        assertThrows(BusinessRuleException.class, () -> locations.delete(second.id()));
        departments.setArchived(department.id(), true);
        assertTrue(departments.get(department.id()).archived());
        assertEquals("Edmonton", locations.get(second.id()).name());
        assertThrows(BusinessRuleException.class, () -> locations.delete(second.id()));
    }

    @Test
    void departmentNamesAreGloballyUniqueAndFailedUpdatesRollBack() {
        var first = locations.create(new CreateLocationRequest("Calgary"));
        var second = locations.create(new CreateLocationRequest("Edmonton"));
        departments.create(new CreateDepartmentRequest("Operations", first.id()));
        assertThrows(BusinessRuleException.class,
                () -> departments.create(new CreateDepartmentRequest(" operations ", second.id())));
        var sales = departments.create(new CreateDepartmentRequest("Sales", first.id()));
        assertThrows(BusinessRuleException.class,
                () -> departments.replace(sales.id(), new UpdateDepartmentRequest("OPERATIONS", second.id())));
        assertEquals("Sales", departments.get(sales.id()).name());
        assertEquals(first.id(), departments.get(sales.id()).locationId());
        assertThrows(LocationNotFoundException.class,
                () -> departments.replace(sales.id(), new UpdateDepartmentRequest("Changed", Long.MAX_VALUE)));
        assertEquals("Sales", departments.get(sales.id()).name());
    }

    @Test
    void databaseUniqueIndexesProtectWritesThatBypassServiceChecks() {
        var location = locations.create(new CreateLocationRequest("Calgary"));
        departments.create(new CreateDepartmentRequest("Operations", location.id()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO locations(name) VALUES (?)", "CALGARY"));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO departments(department_name, location_id) VALUES (?, ?)",
                        "OPERATIONS", location.id()));
        assertEquals(1, locations.list().size());
        assertEquals(1, departments.list(null).size());
    }

    @Test
    void foreignKeyProtectsAgainstOrphansAndConcurrentParentDeletion() {
        var location = locations.create(new CreateLocationRequest("Calgary"));
        departments.create(new CreateDepartmentRequest("Operations", location.id()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("DELETE FROM locations WHERE id = ?", location.id()));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO departments(department_name, location_id) VALUES (?, ?)",
                        "Sales", Long.MAX_VALUE));
        assertEquals(1, departments.list(location.id()).size());
    }

    @Test
    void staleConcurrentUpdateCannotOverwriteCommittedChange() {
        var location = locations.create(new CreateLocationRequest("Calgary"));
        try (var first = entityManagers.createEntityManager(); var second = entityManagers.createEntityManager()) {
            first.getTransaction().begin();
            second.getTransaction().begin();
            Location firstCopy = first.find(Location.class, location.id());
            Location secondCopy = second.find(Location.class, location.id());
            firstCopy.rename("Edmonton");
            first.getTransaction().commit();
            secondCopy.rename("Vancouver");
            assertThrows(RollbackException.class, () -> second.getTransaction().commit());
        }
        assertEquals("Edmonton", locations.get(location.id()).name());
    }

    @Test
    void httpCrudRunsThroughRealServicesAndDatabase() throws Exception {
        String body = mvc.perform(post("/api/locations").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Calgary\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        Number locationId = JsonPath.read(body, "$.id");
        String departmentBody = mvc.perform(post("/api/departments").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Operations\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.locationName").value("Calgary"))
                .andReturn().getResponse().getContentAsString();
        Number departmentId = JsonPath.read(departmentBody, "$.id");
        mvc.perform(put("/api/locations/" + locationId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Edmonton\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/departments/" + departmentId))
                .andExpect(status().isOk()).andExpect(jsonPath("$.locationName").value("Edmonton"));
        mvc.perform(delete("/api/locations/" + locationId)).andExpect(status().isConflict());
        mvc.perform(post("/api/departments/" + departmentId + "/archive")).andExpect(status().isOk())
                .andExpect(jsonPath("$.archived").value(true));
        mvc.perform(delete("/api/locations/" + locationId)).andExpect(status().isConflict());
        mvc.perform(get("/api/locations/" + locationId)).andExpect(status().isOk());
    }

    @Test
    void networkRequestsReachTheRunningMicroservice() throws Exception {
        var created = send("POST", "/api/locations", "{\"name\":\" Calgary \"}");
        assertEquals(201, created.statusCode());
        String resource = created.headers().firstValue("Location").orElseThrow();
        var fetched = send("GET", resource, null);
        assertEquals(200, fetched.statusCode());
        assertEquals("Calgary", JsonPath.read(fetched.body(), "$.name"));
        assertEquals(409, send("POST", "/api/locations", "{\"name\":\"CALGARY\"}").statusCode());
        var invalid = send("POST", "/api/departments", "{\"name\":\"Sales\",\"locationId\":1.5}");
        assertEquals(400, invalid.statusCode());
        assertEquals("VALIDATION_ERROR", JsonPath.read(invalid.body(), "$.code"));
        assertEquals(204, send("DELETE", resource, null).statusCode());
        assertEquals(404, send("GET", resource, null).statusCode());
    }

    @Test
    void healthProbesReportReadyWithoutExposingDatabaseDetails() throws Exception {
        for (String path : List.of("/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness")) {
            var response = send("GET", path, null);
            assertEquals(200, response.statusCode());
            assertEquals("UP", JsonPath.read(response.body(), "$.status"));
            assertFalse(response.body().contains("components"));
            assertFalse(response.body().contains("jdbc"));
        }
        assertEquals(401, send("GET", "/actuator/env", null).statusCode());
    }

    @Test
    void concurrentCreatesAllowOnlyOneCaseInsensitiveName() throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CyclicBarrier(2);
        try {
            var first = executor.submit(() -> createConcurrently(ready, "Calgary"));
            var second = executor.submit(() -> createConcurrently(ready, "CALGARY"));
            int successes = (first.get(15, TimeUnit.SECONDS) ? 1 : 0)
                    + (second.get(15, TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, successes);
            assertEquals(1, locations.list().size());
        } finally {
            executor.shutdownNow();
        }
    }

    private boolean createConcurrently(CyclicBarrier ready, String name) throws Exception {
        ready.await(5, TimeUnit.SECONDS);
        try {
            locations.create(new CreateLocationRequest(name));
            return true;
        } catch (BusinessRuleException | DataIntegrityViolationException conflict) {
            return false;
        }
    }

    private HttpResponse<String> send(String method, String path, String body) throws Exception {
        var claims = org.springframework.security.oauth2.jwt.JwtClaimsSet.builder()
                .issuer("ems-auth-service").subject(java.util.UUID.randomUUID().toString())
                .issuedAt(java.time.Instant.now()).expiresAt(java.time.Instant.now().plusSeconds(60))
                .claim("role", "ADMIN").claim("token_type", "access").build();
        var header = org.springframework.security.oauth2.jwt.JwsHeader
                .with(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build();
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(body));
        if (path.startsWith("/api/"))
            builder.header("Authorization",
                    "Bearer " + jwtEncoder
                            .encode(org.springframework.security.oauth2.jwt.JwtEncoderParameters.from(header, claims))
                            .getTokenValue());
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
