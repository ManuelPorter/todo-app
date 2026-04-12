# todo-app
todo app 0.1
# Todo App (Spring Boot + H2 + React 18 + TypeScript + Vite + Tailwind CSS)

# Prod server: Express.js with API proxy middleware

This repository contains a minimal Todo application built with Spring Boot (Java), JPA (H2 in-memory database), and a lightweight static JavaScript frontend served from `src/main/resources/static/index.html`.

Quick start (requires Java 17 and Maven):

1. Build and run the app:

	mvn -DskipTests spring-boot:run

2. Open the frontend in your browser:

	http://localhost:8080/

API endpoints:

- GET /api/todos - list todos
- POST /api/todos - create todo (JSON: {title, description})
- GET /api/todos/{id} - get todo
- PUT /api/todos/{id} - update todo
- DELETE /api/todos/{id} - delete todo

H2 console is available at http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:mem:todos`)

Postgres/MySQL

Frontend (React + TypeScript + Tailwind)
-------------------------------------
I've added a separate frontend under `frontend/` built with Vite + React + TypeScript and Tailwind CSS. It also includes a small Express server to serve built static files and proxy `/api` requests to the Spring Boot backend.

How to run the frontend locally:

1. Change into the `frontend` directory and install dependencies:

	cd frontend
	npm install

2a. For development (Vite dev server with proxy to backend):

	npm run dev

	The Vite dev server runs on http://localhost:5173 and proxies `/api` to the Spring Boot backend at http://localhost:8080.

2b. For production preview / serve built files with the included Express server:

	npm run build
	npm start

	Express will serve the built assets on http://localhost:3000 and proxy `/api` to the backend.

