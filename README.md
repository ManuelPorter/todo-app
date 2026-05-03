# Todo App

A full-stack Todo application with authentication, hierarchical tasks, recurring todos, tagging, and soft deletes.

## Tech Stack

**Backend**
- Java 17 + Spring Boot 3.1.4
- Spring Security with JWT authentication (JJWT 0.12.3)
- Spring Data JPA + H2 database (file-based)
- Flyway database migrations
- Maven

**Frontend**
- React 18 + TypeScript 5
- Vite 5 (dev server) / Express.js (production server)
- Tailwind CSS 3
- Vitest + React Testing Library

---

## Quick Start

**Requirements:** Java 17, Maven, Node.js

### Backend

```bash
mvn -DskipTests spring-boot:run
```

Runs on `http://localhost:8080`

H2 console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:file:./data/todos`)

> Enable H2 console by activating the dev profile: add `-Dspring.profiles.active=dev`

### Frontend

```bash
cd frontend
npm install
```

**Development** (Vite dev server with proxy to backend):
```bash
npm run dev
# http://localhost:5173
```

**Production** (Express server serving built assets):
```bash
npm run build
npm start
# http://localhost:3000
```

---

## Features

- **Authentication** — JWT-based login/register with BCrypt password hashing (24-hour tokens)
- **Todo Management** — Create, update, soft delete, and restore todos
- **Subtasks** — Hierarchical tasks with parent/child relationships
- **Priority Levels** — LOW, MEDIUM, HIGH, URGENT
- **Tags** — User-scoped labels with color support (many-to-many)
- **Recurring Todos** — DAILY, WEEKLY, MONTHLY, and custom weekly bitmask patterns; auto-advances overdue recurring tasks at midnight
- **All-day Events** — Flag todos as all-day (no time component)
- **Trash / Soft Deletes** — Deleted todos go to trash, can be restored or permanently deleted
- **Bulk Operations** — Bulk mark complete, bulk delete, bulk restore
- **Search & Pagination** — Search by title/description; paginated, sortable list endpoints
- **Scheduled Recurrence** — Spring `@Scheduled` job runs daily at midnight to advance overdue recurring tasks

---

## API Endpoints

All endpoints except `/api/auth/**` require `Authorization: Bearer <token>`.

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
```

### Todos
```
GET    /api/todos                      # List todos (paginated, searchable)
POST   /api/todos                      # Create todo
GET    /api/todos/{id}                 # Get todo
PUT    /api/todos/{id}                 # Update todo
DELETE /api/todos/{id}                 # Soft delete

GET    /api/todos/{id}/subtasks        # List subtasks
POST   /api/todos/{id}/subtasks        # Create subtask

GET    /api/todos/trash                # List trashed todos
PUT    /api/todos/{id}/restore         # Restore from trash
DELETE /api/todos/{id}/permanent       # Permanent delete
DELETE /api/todos/trash                # Empty trash

PUT    /api/todos/bulk/mark-complete   # Bulk mark complete
DELETE /api/todos/bulk                 # Bulk soft delete
PUT    /api/todos/bulk/restore         # Bulk restore
```

### Tags
```
GET    /api/tags                       # List user's tags
POST   /api/tags                       # Create tag
PUT    /api/tags/{id}                  # Update tag
DELETE /api/tags/{id}                  # Delete tag
```

---

## Database Migrations

Managed by Flyway. Migration scripts are in `src/main/resources/db/migration/`:

| Version | Description |
|---------|-------------|
| V1 | Initial schema — users, tags, todos, todo_tags |
| V2 | Add all-day event support |

---

## Tests

### Backend

```bash
# Run all tests
mvn test

# Run a specific test class
mvn test -Dtest=AuthControllerTest
mvn test -Dtest=TodoControllerTest
mvn test -Dtest=JwtUtilTest

# Run a specific test method
mvn test -Dtest=TodoControllerTest#deleteTodo_existingId_returnsNoContent
```

### Frontend

```bash
cd frontend

npm test                  # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # Run with coverage report
```
