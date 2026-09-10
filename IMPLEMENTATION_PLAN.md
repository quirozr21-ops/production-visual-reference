# Implementation Plan

## Phase 1 — Foundation (implemented in this starter)

- Architecture and trust boundaries
- PostgreSQL schema
- Role model and RLS
- Private storage policy
- Approval/rejection/submit database functions
- Supabase SSR clients and session refresh proxy
- Mobile operator search
- Product reference page
- Revision mismatch banner
- Visual gallery
- QR SVG generator
- Dashboard shell
- Logic tests
- `CLAUDE.md` and `progress.md`

## Phase 2 — Controlled authoring

- Engineering product create/edit screen
- Revision create/edit screen
- Direct-to-private-bucket photo upload
- Category/sort/description editing
- critical quality note editing
- Submit-for-approval UI
- Quality approval queue
- Reject with reason
- Historical revision viewer

## Phase 3 — Document Control

- ECN linking and validation
- Work-instruction linking
- revision-change review checklist
- reference completeness checklist
- product-family administration
- user/role administration
- exportable audit report

## Phase 4 — Production hardening

- SSO configuration for company identity provider
- session timeout policy
- security headers/CSP
- rate limiting
- structured logs
- monitoring/alerting
- image optimization derivatives
- backup/restore validation
- disaster-recovery procedure
- automated browser E2E workflow

## Phase 5 — Manufacturing integrations

- released BOM link
- inspection-list link
- PO/receiving status link
- ECN feed/API integration
- barcode/QR label printer formats
- optional kiosk mode
