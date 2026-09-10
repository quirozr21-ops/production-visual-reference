# Progress

Updated: 2026-09-10

## Completed

- [x] Architecture documented
- [x] Database schema designed
- [x] Initial Supabase migration created
- [x] Application roles defined
- [x] RLS policies defined
- [x] Private photo-storage policy defined
- [x] Transactional submit/approve/reject functions created
- [x] Audit-event table and workflow audit writes created
- [x] Next.js 16.3.4 App Router project structure created
- [x] Supabase SSR browser/server clients scaffolded
- [x] Next.js `proxy.ts` session refresh scaffolded
- [x] Mobile operator search page created
- [x] Permanent part-number reference route created
- [x] Revision match/mismatch logic created
- [x] Approved visual gallery created
- [x] QR SVG endpoint created
- [x] Engineering/Quality dashboard starter created
- [x] Logic tests created and locally executed with Node type stripping
- [x] Permanent QR URL helper and QR invariant tests added
- [x] Automatic row-level audit triggers added
- [x] Controlled product creation screen added
- [x] Demo mode created for UI preview before Supabase configuration

## In progress / next

- [x] Product create UI
- [ ] Product edit UI
- [x] Revision authoring UI
- [x] Image upload UI
- [x] Quality approval queue actions
- [x] Historical revision viewer
- [ ] user/role administration
- [ ] generated Supabase TypeScript DB types
- [ ] production identity-provider/SSO configuration
- [ ] end-to-end browser tests
- [x] CI workflow
- [ ] deployment configuration

## Architectural decisions

- Permanent QR URLs resolve current state server-side.
- Product table stores current engineering and current approved visual revision codes for fast operator rendering and safe mismatch reporting.
- Revision approval is a database transaction, not a sequence of client mutations.
- Production never needs a revision picker for normal use.
- Private storage + RLS is required.
- Proxy refreshes sessions but is not the authorization boundary.

## Known issues

- Logic tests pass locally (13/13). Dependency installation timed out in this build environment, so full lint/build validation is delegated to the GitHub Actions CI workflow.
- Supabase project credentials are not configured.
- Supabase project credentials are still required before live controlled records and private images can be exercised end-to-end.

## Phase 2 implementation — 2026-09-10

- Added controlled product revision workspace and revision creation.
- Added editable ECN and critical-quality-note fields for Draft/Rejected revisions.
- Added private categorized image upload with server-side type/size validation.
- Added Draft/Rejected image removal while preventing deletion of approved/obsolete evidence.
- Added Quality approval queue and approve/reject actions backed by transactional PostgreSQL functions.
- Added full historical revision viewer for controlled roles.
- Resubmission now resets image disposition state to Draft for a fresh Quality review.
- Added dashboard product navigation and role-aware controlled actions.
- Added tests for rejected-revision resubmission, image categories, MIME types, filename sanitization, and upload-size invariant.
