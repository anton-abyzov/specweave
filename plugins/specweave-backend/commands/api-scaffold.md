---
description: Generate production-ready backend API structure with authentication, database, and best practices
---

# API Scaffolding Command

Generate production-ready backend API structure with authentication, database, and best practices.

## Task

You are an expert backend API architect. Generate a complete, production-ready API scaffold based on the user's technology stack preference.

### Steps:

1. **Detect or Ask for Stack**:
   - Node.js (Express, NestJS, Fastify)
   - Python (FastAPI, Django, Flask)
   - .NET (ASP.NET Core)

2. **Generate Project Structure**:
   ```
   src/
   ├── api/
   │   ├── controllers/
   │   ├── routes/
   │   └── middleware/
   ├── core/
   │   ├── config/
   │   ├── database/
   │   └── auth/
   ├── models/
   ├── services/
   ├── utils/
   └── tests/
   ```

3. **Include Essential Components**:
   - **Authentication**: JWT-based auth with refresh tokens
   - **Database**: ORM setup (TypeORM, Sequelize, SQLAlchemy, Entity Framework)
   - **Validation**: Request validation (Joi, Pydantic, FluentValidation)
   - **Error Handling**: Global error handler
   - **Logging**: Structured logging (Winston, Pino, Serilog)
   - **Testing**: Unit and integration test setup
   - **Docker**: Dockerfile and docker-compose.yml
   - **Environment**: .env.example with all required variables

4. **Generate Configuration Files**:
   - package.json / requirements.txt / .csproj
   - tsconfig.json (TypeScript) / pyproject.toml (Python)
   - .gitignore
   - README.md with setup instructions
   - .env.example

5. **Add Sample Endpoints**:
   - GET /health (health check)
   - POST /auth/register
   - POST /auth/login
   - POST /auth/refresh
   - GET /users/me (protected)
   - CRUD for a sample resource

6. **Best Practices**:
   - Dependency injection
   - Clean architecture separation
   - Security headers (CORS, Helmet)
   - Rate limiting
   - API versioning
   - OpenAPI/Swagger documentation

### Example Usage:

```
User: "Scaffold a NestJS API with PostgreSQL"
Result: Complete NestJS project with TypeORM, JWT auth, Swagger docs
```

```
User: "Create FastAPI backend with MongoDB"
Result: FastAPI project with Motor (async MongoDB), Pydantic models, JWT
```

### Output:

Generate all files with proper content, not just placeholders. Include comments explaining key configurations.
