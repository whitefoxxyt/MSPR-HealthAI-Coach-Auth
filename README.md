# MSPR HealthAI Coach - AUTH

Microservice d'authentification autonome pour la plateforme HealthAI Coach.

Stack : Bun + Hono + better-auth + Drizzle ORM + PostgreSQL 17.

Ce service est independant : il embarque sa propre base de donnees et ne depend d'aucun autre microservice.
Il expose des JWT signés que les autres services peuvent verifier avec `BETTER_AUTH_SECRET`.

## Demarrage

```bash
cp .env.example .env
# Remplir BETTER_AUTH_SECRET (min 32 chars) et RESEND_API_KEY
docker compose up -d
```

Les deux containers (auth-db + auth-service) demarrent automatiquement.

## Variables d'environnement

| Variable | Defaut | Description |
|----------|--------|-------------|
| `DATABASE_URL` | voir .env.example | URL de connexion PostgreSQL |
| `BETTER_AUTH_URL` | `http://localhost:3000` | URL publique du service |
| `BETTER_AUTH_SECRET` | - | Secret JWT (min 32 chars, obligatoire) |
| `RESEND_API_KEY` | - | Cle API Resend pour les emails |
| `CORS_ORIGIN` | `http://localhost:5173` | Origine autorisee en CORS |
| `DB_USER` | `root` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `password` | Mot de passe PostgreSQL |
| `DB_NAME` | `auth_db` | Nom de la base |

## Endpoints

| Methode | Route | Description |
|---------|-------|-------------|
| POST/GET | `/api/auth/*` | Handler better-auth (signup, signin, verify email, reset password...) |
| GET | `/api/auth/ok` | Healthcheck |
| GET | `/api/auth/reference` | Documentation OpenAPI |
| GET | `/api/session` | Session courante (cookie requis) |
| GET | `/api/jwt` | Genere un JWT signe pour les autres microservices |

## Integration avec les autres microservices

Le endpoint `GET /api/jwt` retourne un JWT signe avec `BETTER_AUTH_SECRET`.
Les autres services verifient ce token avec la meme cle secrete.

```json
{ "token": "<jwt>" }
```

Payload du JWT :
```json
{ "sub": "<user_id>", "email": "...", "name": "...", "exp": "<timestamp>" }
```

## Schema de la base de donnees

```mermaid
erDiagram
    user {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        timestamp created_at
        timestamp updated_at
    }
    session {
        text id PK
        timestamp expires_at
        text token UK
        text ip_address
        text user_agent
        text user_id FK
        timestamp created_at
        timestamp updated_at
    }
    account {
        text id PK
        text account_id
        text provider_id
        text user_id FK
        text access_token
        text refresh_token
        text id_token
        timestamp access_token_expires_at
        timestamp refresh_token_expires_at
        text scope
        text password
        timestamp created_at
        timestamp updated_at
    }
    verification {
        text id PK
        text identifier
        text value
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }
    jwks {
        text id PK
        text public_key
        text private_key
        timestamp created_at
    }

    user ||--o{ session : "user_id"
    user ||--o{ account : "user_id"
```

## Migrations

Les migrations Drizzle sont dans `src/db/migrations/` et s'appliquent via :

```bash
bun run db:migrate
```

## Ports

| Service | Port hote |
|---------|-----------|
| auth-service | 3000 |
| auth-db (PostgreSQL 17) | 5433 |
