# Web App Blueprint — Project Specification

## Purpose

This is a reusable blueprint project to be forked for each new web application.
It provides a standardized, fully isolated stack per app with a consistent dev and deployment setup.

---

## Stack Overview

| Layer | Technology | Notes |
|---|---|---|
| Backend | Quarkus + Kotlin | Lightweight containers, fast startup |
| Frontend | Next.js (React) | SSR, SEO-friendly, consumer-facing |
| Database | PostgreSQL | One instance per app, isolated |
| Auth | Quarkus SmallRye JWT + Quarkus Security | Self-contained, no extra container |
| Styling | CSS Modules | Familiar, full control — can switch to Tailwind per app |
| API style | REST | Simple, idiomatic with Quarkus RESTEasy Reactive |
| DB Migrations | Flyway | Versioned SQL files, simple |
| Build tool | Gradle (backend), npm (frontend) | |
| Version control | GitHub | One repo per app, forked from this blueprint |
| CI/CD | GitHub Actions | Single workflow template, reused per fork |
| Containerization | Docker + Docker Compose | All services containerized |
| Hosting | Infomaniak VPS (Ubuntu 22.04) | Swiss jurisdiction, GDPR + DSG compliant |
| Deployment platform | Coolify (self-hosted) | Manages all apps on one VPS |

---

## Repository Structure

```
blueprint-app/
├── backend/
│   ├── src/
│   │   └── main/
│   │       ├── kotlin/
│   │       │   └── com/appname/
│   │       │       ├── auth/
│   │       │       │   ├── AuthResource.kt       # POST /auth/register, /auth/login, /auth/me
│   │       │       │   ├── AuthService.kt        # Business logic, password hashing, JWT issuing
│   │       │       │   └── UserEntity.kt         # User JPA entity
│   │       │       ├── resource/                 # App-specific REST endpoints
│   │       │       ├── service/                  # App-specific business logic
│   │       │       └── model/                    # App-specific data models
│   │       └── resources/
│   │           ├── application.properties
│   │           └── db/migration/
│   │               └── V1__create_users.sql      # Flyway migration for users table
│   ├── build.gradle.kts
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx                          # Login page
│   │   └── register/
│   │       └── page.tsx                          # Register page
│   ├── components/
│   │   └── ProtectedRoute.tsx                    # Redirects to /login if not authenticated
│   ├── context/
│   │   └── AuthContext.tsx                       # Auth state, useAuth() hook
│   ├── lib/
│   │   └── api.ts                                # Fetch wrapper, auto-attaches JWT header
│   ├── styles/                                   # CSS Modules
│   ├── next.config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml                            # Local development
├── docker-compose.prod.yml                       # Production overrides
├── .github/
│   └── workflows/
│       └── deploy.yml                            # CI/CD pipeline
├── .env.example                                  # Environment variable template
└── README.md
```

---

## Services & Separation

Each app runs as three isolated Docker containers:

```
myapp.com         → Next.js frontend container (port 3000)
api.myapp.com     → Quarkus backend container (port 8080)
(internal)        → PostgreSQL container (port 5432, not public)
```

- Frontend communicates with backend via REST over `api.myapp.com`
- Database is internal only, never exposed publicly
- Coolify handles SSL certificates for both domains automatically
- Each forked app has its own separate database, env vars, and secrets — zero shared state between apps

---

## Local Development (Docker Compose)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      QUARKUS_DATASOURCE_JDBC_URL: jdbc:postgresql://db:5432/appdb
      QUARKUS_DATASOURCE_USERNAME: appuser
      QUARKUS_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SMALLRYE_JWT_SIGN_KEY: ${JWT_PRIVATE_KEY}
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      # Used by server-side rendering (inside Docker network)
      INTERNAL_API_URL: http://backend:8080
      # Used by the browser (public-facing, injected at build time)
      NEXT_PUBLIC_API_URL: http://localhost:8080
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## Environment Variables

```bash
# .env.example — copy to .env and fill in values

# Database
DB_PASSWORD=changeme

# Backend
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://db:5432/appdb
QUARKUS_DATASOURCE_USERNAME=appuser
QUARKUS_DATASOURCE_PASSWORD=changeme
# RSA private key in PEM format (base64-encoded or path to file)
# Generate with: openssl genrsa -out jwt-private.pem 2048
SMALLRYE_JWT_SIGN_KEY=changeme_path_or_base64_encoded_pem

# Frontend
# Server-side (SSR) — backend hostname within Docker network
INTERNAL_API_URL=http://backend:8080
# Client-side (browser) — public API domain
NEXT_PUBLIC_API_URL=https://api.myapp.com
```

---

## Auth Implementation

Auth is fully pre-wired in the blueprint. Every forked app gets working login/register out of the box.

### Backend (Quarkus)

**Flyway migration** — `V1__create_users.sql`:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

**Endpoints:**

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create new user, returns JWT |
| POST | `/auth/login` | No | Validate credentials, returns JWT |
| GET | `/auth/me` | Yes | Return current user from token |

**Key implementation details:**
- Passwords hashed with Bcrypt via `quarkus-security`
- JWT signed with an RSA private key via `quarkus-smallrye-jwt` (SmallRye JWT uses asymmetric keys, not a symmetric secret — generate a 2048-bit RSA key pair; the private key signs tokens, the public key validates them)
- JWT payload includes: `sub` (user id), `email`, `exp` (expiry)
- JWT is set as an `httpOnly`, `Secure`, `SameSite=Strict` cookie by the backend — never returned in the response body
- Any endpoint can be protected with `@Authenticated` annotation
- Role-based access available via `@RolesAllowed("admin")` if needed later
- CORS must be configured in `application.properties` to allow requests from the frontend domain with `credentials: true`

**Required `application.properties` entries:**
```properties
# CORS
quarkus.http.cors=true
quarkus.http.cors.origins=https://myapp.com
quarkus.http.cors.methods=GET,POST,PUT,DELETE,OPTIONS
quarkus.http.cors.headers=Content-Type,Authorization
quarkus.http.cors.exposed-headers=Set-Cookie
quarkus.http.cors.access-control-allow-credentials=true

# JWT (public key for validation; private key injected via env var at runtime)
mp.jwt.verify.publickey.location=jwt-public.pem
mp.jwt.verify.issuer=https://api.myapp.com
```

**Quarkus extensions used for auth:**
- `quarkus-smallrye-jwt` — issue and validate JWTs
- `quarkus-security` — `@Authenticated`, `@RolesAllowed` annotations
- `quarkus-hibernate-orm-panache-kotlin` — User entity persistence

### Frontend (Next.js)

**`AuthContext.tsx`** — global auth state:
- JWT is stored in an `httpOnly` cookie set by the backend — never touches JavaScript or `localStorage`
- Auth state (user info) held in React context, hydrated from `GET /auth/me` on load
- Exposes `user`, `login()`, `logout()`, `register()`
- `useAuth()` hook available anywhere in the app

**`api.ts`** — fetch wrapper:
- Sends requests with `credentials: 'include'` so the browser automatically includes the `httpOnly` cookie
- No manual `Authorization` header management needed
- Redirects to `/login` on 401 response (intentional — no silent token refresh; user re-authenticates)
- For server-side requests (SSR/RSC), uses `INTERNAL_API_URL` (`http://backend:8080`) to reach the backend inside Docker; browser requests use `NEXT_PUBLIC_API_URL`

**`ProtectedRoute.tsx`** — wraps any page that requires login:
- Checks auth state on mount
- Redirects to `/login` if not authenticated

**Pre-built pages:**
- `/login` — email + password form, calls `POST /auth/login`
- `/register` — email + password form, calls `POST /auth/register`

### What is NOT included (add per app when needed)
- Password reset (requires email/SMTP setup)
- Social logins (Google, GitHub etc)
- Email verification
- Role management UI
- Refresh tokens — on access token expiry the user is redirected to `/login`; add a refresh token flow per app if session longevity matters

---

## Backend (Quarkus + Kotlin)

**Quarkus extensions:**

| Extension | Purpose |
|---|---|
| `quarkus-resteasy-reactive-jackson` | REST endpoints |
| `quarkus-hibernate-orm-panache-kotlin` | ORM with Kotlin support |
| `quarkus-jdbc-postgresql` | PostgreSQL driver |
| `quarkus-smallrye-jwt` | JWT issuing and validation |
| `quarkus-security` | Annotations, role management |
| `quarkus-flyway` | Database migrations |
| `quarkus-hibernate-validator` | Input validation |
| `quarkus-container-image-docker` | Docker image build |

`build.gradle.kts`:
```kotlin
plugins {
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.allopen") version "2.0.0"
    id("io.quarkus") version "3.11.0"
}

dependencies {
    implementation(enforcedPlatform("io.quarkus.platform:quarkus-bom:3.11.0"))
    implementation("io.quarkus:quarkus-resteasy-reactive-jackson")
    implementation("io.quarkus:quarkus-hibernate-orm-panache-kotlin")
    implementation("io.quarkus:quarkus-jdbc-postgresql")
    implementation("io.quarkus:quarkus-smallrye-jwt")
    implementation("io.quarkus:quarkus-security")
    implementation("io.quarkus:quarkus-flyway")
    implementation("io.quarkus:quarkus-hibernate-validator")
    implementation("io.quarkus:quarkus-container-image-docker")
}
```

`Dockerfile` (backend):
```dockerfile
# Build stage — compiles the Quarkus app inside Docker (no pre-built JAR required)
FROM gradle:8.7-jdk21 AS builder
WORKDIR /app
COPY . .
RUN gradle build -x test --no-daemon

# Run stage — minimal runtime image
FROM registry.access.redhat.com/ubi8/openjdk-21:latest
COPY --chown=185 /app/build/quarkus-app/ /deployments/
EXPOSE 8080
USER 185
CMD ["java", "-jar", "/deployments/quarkus-run.jar"]
```

> Note: For faster local iteration, run `./gradlew quarkusDev` directly (no Docker needed). This enables live reload on source changes and exposes the Quarkus Dev UI at `http://localhost:8080/q/dev`.

---

## Frontend (Next.js)

- App Router (not Pages Router)
- TypeScript enabled
- CSS Modules for styling (can switch to Tailwind per app)
- Browser fetches use `NEXT_PUBLIC_API_URL`; server-side fetches use `INTERNAL_API_URL`
- `next.config.ts` must set `output: 'standalone'` for the Docker image to work

`next.config.ts`:
```typescript
const nextConfig = {
  output: 'standalone',
}
export default nextConfig
```

`Dockerfile` (frontend):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## CI/CD Pipeline (GitHub Actions)

On push to `main`, builds backend and triggers Coolify deploy webhooks for both services.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Build backend
        # Tests skipped here — add a separate test job when tests exist
        run: cd backend && ./gradlew build -x test
      - name: Trigger Coolify deploy (backend)
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_BACKEND }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}"

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger Coolify deploy (frontend)
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_FRONTEND }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}"
```

GitHub Secrets required per forked repo:
- `COOLIFY_TOKEN` — Coolify API token
- `COOLIFY_WEBHOOK_BACKEND` — Coolify deploy webhook URL for backend
- `COOLIFY_WEBHOOK_FRONTEND` — Coolify deploy webhook URL for frontend

---

## Infrastructure (Coolify on Infomaniak VPS)

### VPS Spec

| | Minimum (1 app) | Recommended (3-4 apps) |
|---|---|---|
| Provider | Infomaniak VPS Lite | Infomaniak VPS Cloud |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 1 vCore | 2 vCore |
| RAM | 2 GB | 4 GB |
| Storage | 20 GB NVMe | 40 GB NVMe |

### RAM estimate per app

| Component | RAM usage |
|---|---|
| Coolify (shared, once) | ~400 MB |
| Quarkus container | ~150 MB |
| Next.js container | ~150 MB |
| PostgreSQL container | ~150 MB |
| **Per app total** | **~450 MB** |

### Coolify Installation
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### Per-app setup in Coolify
1. Connect GitHub repo
2. Create two services: backend + frontend
3. Add environment variables per service
4. Assign domains: `myapp.com` and `api.myapp.com`
5. Enable automatic SSL (Let's Encrypt)
6. Copy deploy webhook URLs → paste into GitHub Secrets
7. Create PostgreSQL service, link to backend env vars

---

## Forking Workflow (New App Checklist)

- [ ] Fork this repo on GitHub, rename to `my-new-app`
- [ ] Run `./init.sh <appname>` to replace all `appname` placeholders throughout the codebase (script does find/replace across Kotlin packages, config files, and compose files)
- [ ] Generate RSA key pair for JWT: `openssl genrsa -out jwt-private.pem 2048 && openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem`
- [ ] Update `NEXT_PUBLIC_API_URL` and `INTERNAL_API_URL` in `.env.example`
- [ ] Update CORS origin in `application.properties`
- [ ] Create new app in Coolify, assign new domains
- [ ] Add GitHub Secrets (`COOLIFY_TOKEN`, webhooks) to new repo
- [ ] Create new PostgreSQL instance in Coolify for this app
- [ ] Update `.env` with new DB credentials and the RSA private key
- [ ] Push to `main` → first deploy triggered automatically

> `init.sh` is a simple script in the blueprint root that takes the app name as an argument and runs sed/find-replace across all relevant files, then renames the Kotlin package directory.

---

## Security Notes

- Database port never exposed publicly, internal Docker network only
- All secrets via environment variables, never hardcoded
- Passwords hashed with Bcrypt, never stored in plain text
- JWT signed with RSA private key (per-app), short expiry recommended (1h); token stored in `httpOnly` cookie — not accessible to JavaScript
- CORS configured to allow only the app's own frontend domain with `credentials: true`
- Coolify handles SSL termination
- Infomaniak VPS includes DDoS protection and configurable firewall
- Swiss jurisdiction: data processed under Swiss DSG + GDPR

---

## Database Backups

No backup automation is included in the blueprint. Options per app:

- **Coolify built-in**: Coolify supports scheduled PostgreSQL backups to S3-compatible storage — enable per app in the Coolify UI
- **Manual**: `docker exec <db-container> pg_dump -U appuser appdb > backup.sql`
- Backups are not shared between apps — each PostgreSQL instance is independent
