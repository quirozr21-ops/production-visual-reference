# Claude Code Instructions — Production Visual Reference

## Mission

Build a controlled manufacturing visual-reference application for Production, Quality, Engineering, Document Control, and administrators.

The operator must never manually determine the current revision.

## Non-negotiable domain rules

1. A QR code identifies a permanent product record. It MUST NOT encode revision, credentials, tokens, or photo URLs.
2. `current_engineering_revision` and `current_approved_visual_revision` are separate values.
3. A visual reference is GREEN only when those revision values match and the visual revision is approved.
4. A mismatch must be RED and must direct Production to released engineering documentation.
5. Draft/pending/rejected images must never be visible to Production.
6. Historical revisions are retained. Do not automatically delete them.
7. Visual references are production aids, not the authoritative engineering definition.
8. Authorization must be enforced server-side AND by Supabase RLS. Do not treat client-side UI hiding or Next.js Proxy as authorization.
9. The photo storage bucket is private.
10. Quality approval must be transactional.

## Stack

- Next.js 16.3.x App Router + TypeScript
- React
- Supabase PostgreSQL/Auth/Storage
- `@supabase/ssr` cookie sessions
- Tailwind/CSS or plain CSS; prioritize accessible mobile UX

## Work sequence

Before code changes:

1. Read `ARCHITECTURE.md`.
2. Read `IMPLEMENTATION_PLAN.md`.
3. Read `progress.md`.
4. Inspect migrations before changing domain behavior.
5. Update/add tests with behavioral changes.

After code changes:

1. Run logic/unit tests.
2. Run lint.
3. Run build.
4. Update `progress.md`.
5. Make a logical Git commit.

Never delete or weaken a test just to make CI pass.

## Database conventions

- IDs: UUID.
- timestamps: `timestamptz`.
- use RLS on controlled tables.
- privileged state transitions should be PostgreSQL functions with caller-role verification.
- write audit records for meaningful manufacturing/control changes.

## UX conventions

Production operator pages:
- large touch targets;
- part number visually dominant;
- status color is reinforced by text/icon, never color only;
- normally reach the correct visual in <=2 interactions;
- no revision picker on the primary Production path.

Quality/Engineering:
- explicit status and reason fields;
- confirmation before controlled state changes;
- historical information never confused with current state.

## Security

Never expose `SUPABASE_SECRET_KEY` to the client.
Never make the storage bucket public.
Never place auth tokens in QR codes.
Never rely on a filename to determine revision/current status.
