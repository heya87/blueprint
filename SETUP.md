# Setup Guide

Steps to follow after forking/copying this blueprint.

## 1. Rename the app

Run the init script to replace the package name and app references:

```bash
./init.sh <appname>
```

This replaces `blueprint` / `ch.blueprint` throughout the codebase.

## 2. Generate JWT keys

The PEM files are not committed. Generate a new key pair and place both files in `backend/src/main/resources/`:

```bash
cd backend/src/main/resources
openssl genrsa -out jwt-private.pem 2048
openssl rsa -in jwt-private.pem -pubout -outform PEM -out jwt-public.pem
```

These are used to sign (`jwt-private.pem`) and verify (`jwt-public.pem`) JWT tokens.
**Never commit them.** Each environment (dev, staging, prod) should have its own pair.

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables are documented in `.env.example`.

## 4. IntelliJ IDEA

1. `File → Project Structure → SDK` — set to JDK 21+
2. `Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JVM` — set to **Project SDK**

Without this, Gradle will fail with `invalid source release: 21`.

## 5. Run the stack

**Dev (no Docker, live reload):**
```bash
cd backend && ./gradlew quarkusDev   # http://localhost:8080
cd frontend && npm run dev           # http://localhost:3000
```

**Full stack with Docker:**
```bash
docker compose up --build
```
