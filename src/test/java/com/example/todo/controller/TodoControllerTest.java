package com.example.todo.controller;

import com.example.todo.repository.TodoRepository;
import com.example.todo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TodoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TodoRepository todoRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        todoRepository.deleteAll();
        userRepository.deleteAll();
        token = registerAndGetToken("todouser", "password123");
    }

    private String registerAndGetToken(String username, String password) throws Exception {
        String body = String.format("{\"username\":\"%s\",\"password\":\"%s\"}", username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("token").asText();
    }

    private long createTodo(String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/todos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"title\":\"%s\"}", title)))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // ── Create ──────────────────────────────────────────────────────────────

    @Test
    void createTodo_validTitle_returnsCreatedTodo() throws Exception {
        mockMvc.perform(post("/api/todos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Buy groceries\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Buy groceries"))
                .andExpect(jsonPath("$.completed").value(false));
    }

    @Test
    void createTodo_blankTitle_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/todos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void createTodo_noToken_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Unauthorized\"}"))
                .andExpect(status().isForbidden());
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @Test
    void listTodos_returnsPaginatedResults() throws Exception {
        createTodo("Task one");
        createTodo("Task two");

        mockMvc.perform(get("/api/todos")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void listTodos_searchByTitle_filtersResults() throws Exception {
        createTodo("Buy milk");
        createTodo("Read book");

        mockMvc.perform(get("/api/todos?q=milk")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Buy milk"));
    }

    @Test
    void listTodos_emptyForNewUser_returnsZeroResults() throws Exception {
        mockMvc.perform(get("/api/todos")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    // ── Get ──────────────────────────────────────────────────────────────────

    @Test
    void getTodo_existingId_returnsTodo() throws Exception {
        long id = createTodo("Find me");

        mockMvc.perform(get("/api/todos/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Find me"));
    }

    @Test
    void getTodo_nonExistentId_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/todos/99999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // ── Update ───────────────────────────────────────────────────────────────

    @Test
    void updateTodo_changesFieldsAndReturnsUpdated() throws Exception {
        long id = createTodo("Original title");

        mockMvc.perform(put("/api/todos/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated title\",\"completed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated title"))
                .andExpect(jsonPath("$.completed").value(true));
    }

    @Test
    void updateTodo_blankTitle_returnsBadRequest() throws Exception {
        long id = createTodo("Valid title");

        mockMvc.perform(put("/api/todos/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"completed\":false}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateTodo_nonExistentId_returnsNotFound() throws Exception {
        mockMvc.perform(put("/api/todos/99999")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Ghost\",\"completed\":false}"))
                .andExpect(status().isNotFound());
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    @Test
    void deleteTodo_existingId_returnsNoContent() throws Exception {
        long id = createTodo("Delete me");

        mockMvc.perform(delete("/api/todos/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/todos/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteTodo_nonExistentId_returnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/todos/99999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // ── Ownership isolation ──────────────────────────────────────────────────

    @Test
    void getTodo_byDifferentUser_returnsNotFound() throws Exception {
        long id = createTodo("Private todo");
        String otherToken = registerAndGetToken("otheruser", "password123");

        mockMvc.perform(get("/api/todos/" + id)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteTodo_byDifferentUser_returnsNotFound() throws Exception {
        long id = createTodo("Someone else's todo");
        String otherToken = registerAndGetToken("attacker", "password123");

        mockMvc.perform(delete("/api/todos/" + id)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void listTodos_doesNotReturnOtherUsersTodos() throws Exception {
        createTodo("My private task");
        String otherToken = registerAndGetToken("visitor", "password123");

        mockMvc.perform(get("/api/todos")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }
}
