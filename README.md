# Express + Drizzle PostgreSQL API

This project uses Express, Drizzle ORM, and PostgreSQL.

## Setup

1. Copy `.env.example` to `.env`.
2. Store your PostgreSQL connection string in AWS Systems Manager Parameter Store as a SecureString named `/database/url`.
3. Install dependencies with `npm install`.
4. Start the server with `npm run dev` or `npm start`.

The app reads `DATABASE_URL` from AWS SSM on startup. By default it uses:

- `AWS_REGION=eu-north-1`
- `DATABASE_URL_PARAMETER_NAME=/database/url`

For local development you can still set `DATABASE_URL` directly in `.env`; if present, it will be used instead of SSM.

## Endpoints

- `GET /health`
- `GET /api/users`

On startup, the app ensures a `users` table exists and seeds a few users if the table is empty.
