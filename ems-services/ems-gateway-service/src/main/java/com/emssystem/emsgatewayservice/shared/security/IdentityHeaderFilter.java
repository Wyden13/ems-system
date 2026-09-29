package com.emssystem.emsgatewayservice.shared.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.*;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class IdentityHeaderFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(new HttpServletRequestWrapper(request) {
            private boolean identity(String name) {
                return name.toLowerCase(Locale.ROOT).startsWith("x-user-");
            }

            @Override
            public String getHeader(String name) {
                return identity(name) ? null : super.getHeader(name);
            }

            @Override
            public Enumeration<String> getHeaders(String name) {
                return identity(name) ? Collections.emptyEnumeration() : super.getHeaders(name);
            }

            @Override
            public Enumeration<String> getHeaderNames() {
                return Collections.enumeration(
                        Collections.list(super.getHeaderNames()).stream().filter(name -> !identity(name)).toList());
            }
        }, response);
    }
}
