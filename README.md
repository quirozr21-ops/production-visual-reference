# Production Visual Reference System

Mobile-first internal manufacturing application for Production, Quality, Engineering, and Document Control.

## Core rule

A QR code identifies a permanent product record, never a revision. The server resolves the current engineering revision and current approved visual revision at request time.

## Current implementation

The first usable slice includes:

- mobile-first operator search;
- permanent `/p/[partNumber]` product routes;
- current-vs-approved revision status banner;
- approved visual gallery model;
- printable QR SVG endpoint;
- Supabase SSR/auth scaffolding;
- PostgreSQL/Supabase schema, RLS, private storage policies, and approval functions;
- Engineering/Quality dashboard shell;
- audit-ready data model;
- deterministic business-logic tests;
- demo mode so the UI can be previewed before Supabase is configured.

See `IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`, and `progress.md`.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project.
4. Apply `supabase/migrations/202609100001_initial_schema.sql`.
5. Set the Supabase URL and publishable key.
6. Set `NEXT_PUBLIC_DEMO_MODE=false` after creating user profiles and roles.
7. Run `npm run dev`.

## Authentication

Production data is intended to require authentication. In demo mode, sample data is intentionally available for local UI development only.

## Security

- The QR contains only a permanent product URL.
- The photo bucket is private.
- Production access is limited by database RLS to approved references.
- Privileged workflow changes happen in PostgreSQL functions that re-check the caller's role.
- Authorization must also be checked in server code; `proxy.ts` only refreshes the session.
