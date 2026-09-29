package com.emssystem.emsgatewayservice;

import com.emssystem.emsgatewayservice.shared.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GatewayAccessTest.Probe.class)
@Import({SecurityConfig.class, GatewayAccessTest.Probe.class})
class GatewayAccessTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder decoder;
    @RestController static class Probe {
        @GetMapping({"/api/shifts/options", "/api/shift-categories", "/api/availability/me", "/api/pto/requests", "/api/employees"})
        String read() { return "ok"; }
    }
    @Test void newWorkflowsRequireAuthenticationAndReachOwningServices() throws Exception {
        for (String path : new String[]{"/api/shifts/options", "/api/shift-categories", "/api/availability/me", "/api/pto/requests"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            mvc.perform(get(path).with(jwt())).andExpect(status().isOk());
        }
    }
    @Test void managementRemainsRestricted() throws Exception {
        mvc.perform(get("/api/employees").with(jwt())).andExpect(status().isForbidden());
    }
}
