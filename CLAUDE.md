# Blueprint — Claude Instructions

Full project specification: [blueprint-spec.md](./blueprint-spec.md)

## Dev Commands

**Backend** (no Docker, live reload):
```bash
cd backend && ./gradlew quarkusDev
```

**Frontend** (no Docker, live reload):
```bash
cd frontend && npm run dev
```

**Full stack** (Docker):
```bash
docker compose up --build
```

## Your behaviour

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.|

## Conventions

- Kotlin package root: `ch.appname` — replace `appname` when forking (use `./init.sh <name>`)
- Flyway migrations: `V<n>__<description>.sql` — never edit existing migrations, always add new ones
- CSS Modules: one file per component, named `ComponentName.module.css`
- New REST resources go in `backend/src/main/kotlin/ch/appname/resource/`
- New business logic goes in `backend/src/main/kotlin/ch/appname/service/`

## Boundaries

- Auth logic stays in `auth/` — do not spread login/JWT/password handling elsewhere
- Never expose the database port outside the Docker network
- Never store secrets in code — use environment variables (see `.env.example`)
- Never put JWT handling in `localStorage` — cookies only (see spec for details)
