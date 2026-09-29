package com.emssystem.emsauthservice;

import com.emssystem.emsauthservice.user.entity.UserAccount;
import com.emssystem.emsauthservice.user.enums.*;
import com.emssystem.emsauthservice.user.repository.UserAccountRepository;
import com.emssystem.emsauthservice.user.service.UserAccountService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import jakarta.servlet.http.Cookie;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest @AutoConfigureMockMvc
class AuthPostgresIT {
    private static final PostgreSQLContainer DATABASE=new PostgreSQLContainer("postgres:18-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        DATABASE.start();registry.add("spring.datasource.url",DATABASE::getJdbcUrl);
        registry.add("spring.datasource.username",DATABASE::getUsername);registry.add("spring.datasource.password",DATABASE::getPassword);
    }
    @AfterAll static void stop() { DATABASE.stop(); }
    @Autowired MockMvc mvc; @Autowired JdbcTemplate jdbc; @Autowired UserAccountRepository accounts;
    @Autowired PasswordEncoder encoder; @Autowired UserAccountService service;
    @BeforeEach void clear() { jdbc.update("DELETE FROM refresh_tokens");jdbc.update("DELETE FROM user_account"); }
    @AfterEach void security() { SecurityContextHolder.clearContext(); }
    private UserAccount seed(String email,RoleType role) { return accounts.saveAndFlush(new UserAccount(email,encoder.encode("Password123!"),role)); }
    private MvcResult login(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
            .content("{\"email\":\""+email+"\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.refreshToken").doesNotExist()).andReturn();
    }
    private Cookie refreshCookie(MvcResult result) { return new Cookie("ems_refresh",result.getResponse().getHeader("Set-Cookie").split(";",2)[0].split("=",2)[1]); }
    private String access(MvcResult result) throws Exception { return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8),"$.accessToken"); }
    @Test void migrationsAuditingAndRealJwtAreWired() throws Exception {
        var admin=seed("admin@test.example",RoleType.ADMIN); assertNotNull(admin.getCreatedAt());assertNotNull(admin.getUpdatedAt());assertNull(admin.getLastLoginAt());
        var result=login(admin.getEmail());assertTrue(result.getResponse().getHeader("Set-Cookie").contains("HttpOnly"));
        mvc.perform(get("/api/v1/admin/accounts").header("Authorization","Bearer "+access(result))).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
        assertNotNull(accounts.findById(admin.getId()).orElseThrow().getLastLoginAt());
    }
    @Test void rotatesRejectsReplayAndRevokesOnLogout() throws Exception {
        seed("employee@test.example",RoleType.EMPLOYEE);var original=refreshCookie(login("employee@test.example"));
        var refreshed=mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(original)).andExpect(status().isOk()).andReturn();
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(original)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/logout").with(csrf()).cookie(refreshCookie(refreshed))).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(refreshCookie(refreshed))).andExpect(status().isUnauthorized());
    }
    @Test void deniesNonAdminsAndInvalidJwt() throws Exception {
        seed("employee@test.example",RoleType.EMPLOYEE);var result=login("employee@test.example");
        mvc.perform(get("/api/v1/admin/accounts").header("Authorization","Bearer "+access(result))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/accounts/me").header("Authorization","Bearer broken")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(refreshCookie(result))).andExpect(status().isForbidden());
    }
    @Test void roleChangeRevokesRefreshAndProtectsSelf() throws Exception {
        var first=seed("admin@test.example",RoleType.ADMIN);var second=seed("other@test.example",RoleType.ADMIN);var otherLogin=login(second.getEmail());var token=access(login(first.getEmail()));
        mvc.perform(patch("/api/v1/admin/accounts/"+first.getId()+"/role").header("Authorization","Bearer "+token).contentType("application/json").content("{\"role\":\"EMPLOYEE\"}")).andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/admin/accounts/"+second.getId()+"/role").header("Authorization","Bearer "+token).contentType("application/json").content("{\"role\":\"EMPLOYEE\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(refreshCookie(otherLogin))).andExpect(status().isUnauthorized());
    }
    @Test void passwordChangeNeedsNoRoleAndRevokesSessions() throws Exception {
        seed("password@test.example", RoleType.EMPLOYEE);
        var session = login("password@test.example");
        mvc.perform(patch("/api/v1/accounts/me/password")
                .header("Authorization", "Bearer " + access(session))
                .contentType("application/json")
                .content("{\"currentPassword\":\"Password123!\",\"newPassword\":\"Aa1" + "x".repeat(70) + "\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").value("newPassword"));
        mvc.perform(patch("/api/v1/accounts/me/password")
                .header("Authorization", "Bearer " + access(session))
                .contentType("application/json")
                .content("""
                    {"currentPassword":"Password123!","newPassword":"UpdatedPassword123!"}
                    """))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/refresh").with(csrf()).cookie(refreshCookie(session)))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                .content("""
                    {"email":"password@test.example","password":"Password123!"}
                    """))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json")
                .content("""
                    {"email":"password@test.example","password":"UpdatedPassword123!"}
                    """))
            .andExpect(status().isOk());
    }
    @Test void concurrentChangesCannotRemoveLastAdministrator() throws Exception {
        var a=seed("a@test.example",RoleType.ADMIN);var b=seed("b@test.example",RoleType.ADMIN);
        var pool=Executors.newFixedThreadPool(2);var barrier=new CyclicBarrier(2);
        try {
            var futures=new ArrayList<Future<Boolean>>();
            for (var id:List.of(a.getId(),b.getId())) futures.add(pool.submit(() -> {
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(UUID.randomUUID().toString(),"",List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
                try { barrier.await(5,TimeUnit.SECONDS);service.changeRole(id,RoleType.EMPLOYEE);return true; }
                catch (org.springframework.web.server.ResponseStatusException conflict) { assertEquals(409,conflict.getStatusCode().value());return false; }
                finally { SecurityContextHolder.clearContext(); }
            }));
            int successes=0;for(var future:futures) if(future.get(10,TimeUnit.SECONDS)) successes++;
            assertEquals(1,successes);assertEquals(1,accounts.countByRoleAndStatus(RoleType.ADMIN,AccountStatus.ACTIVE));
        } finally { pool.shutdownNow(); }
    }
}
