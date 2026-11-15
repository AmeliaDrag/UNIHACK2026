package com.hackathon.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * DemoAuthenticationFilter - Intercepts requests with "Bearer demo-token"
 * and authenticates them as the hardcoded demo user.
 * 
 * Only active when app.demo-auth-enabled=true (typically in dev profile).
 */
@Component
public class DemoAuthenticationFilter extends OncePerRequestFilter {

    private static final String DEMO_TOKEN = "demo-token";
    private static final String DEMO_USER_SUB = "demo-user-1";
    private static final String DEMO_USER_EMAIL = "miriam@ladymap.app";
    private static final String DEMO_USER_NAME = "Miriam";

    @Value("${app.demo-auth-enabled:false}")
    private boolean demoAuthEnabled;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!demoAuthEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            if (DEMO_TOKEN.equals(token)) {
                // Create a mock JWT for the demo user
                Map<String, Object> headers = Map.of("alg", "none", "typ", "JWT");
                Map<String, Object> claims = Map.of(
                    "sub", DEMO_USER_SUB,
                    "email", DEMO_USER_EMAIL,
                    "name", DEMO_USER_NAME,
                    "email_verified", true,
                    "iss", "demo-auth",
                    "aud", "https://unihack-project-api",
                    "iat", Instant.now().getEpochSecond(),
                    "exp", Instant.now().plusSeconds(86400).getEpochSecond()
                );

                Jwt jwt = new Jwt(
                    DEMO_TOKEN,
                    Instant.now(),
                    Instant.now().plusSeconds(86400),
                    headers,
                    claims
                );

                JwtAuthenticationToken authentication = new JwtAuthenticationToken(
                    jwt,
                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                logger.info("[Demo Auth] Authenticated request as demo user: " + DEMO_USER_EMAIL);
            }
        }

        filterChain.doFilter(request, response);
    }
}
