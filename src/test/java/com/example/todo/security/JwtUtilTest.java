package com.example.todo.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String SECRET = "test-secret-key-that-is-long-enough-32-chars!!";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(SECRET);
    }

    @Test
    void generateToken_extractUsername_returnsCorrectSubject() {
        String token = jwtUtil.generateToken("alice");
        assertEquals("alice", jwtUtil.extractUsername(token));
    }

    @Test
    void isValid_freshToken_returnsTrue() {
        String token = jwtUtil.generateToken("bob");
        assertTrue(jwtUtil.isValid(token));
    }

    @Test
    void isValid_tamperedSignature_returnsFalse() {
        String token = jwtUtil.generateToken("alice") + "tampered";
        assertFalse(jwtUtil.isValid(token));
    }

    @Test
    void isValid_garbageString_returnsFalse() {
        assertFalse(jwtUtil.isValid("not.a.valid.jwt"));
    }

    @Test
    void isValid_emptyString_returnsFalse() {
        assertFalse(jwtUtil.isValid(""));
    }

    @Test
    void generateToken_differentUsers_produceDifferentTokens() {
        String t1 = jwtUtil.generateToken("alice");
        String t2 = jwtUtil.generateToken("bob");
        assertNotEquals(t1, t2);
    }
}
