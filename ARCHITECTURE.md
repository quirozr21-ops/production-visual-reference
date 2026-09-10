# System Architecture

## Request flow

```text
Phone camera / desktop search
          |
          v
Permanent product URL
/p/{part-number}
          |
          v
Authenticated Next.js server component
          |
          v
Supabase Postgres + RLS
          |
          +--> products.current_engineering_revision
          |
          +--> products.current_approved_visual_revision
          |
          v
Revision-state calculation
  MATCH -> GREEN
MISMATCH -> RED
          |
          v
Approved visual assets only
          |
          v
Private Supabase Storage
(short-lived signed URL after authorization)
```

## Trust boundaries

1. QR values are untrusted identifiers, not authorization.
2. Browser input is untrusted.
3. Server components and route handlers verify authentication.
4. PostgreSQL RLS is the final data-access boundary.
5. Storage remains private; signed URLs are short-lived.
6. `SUPABASE_SECRET_KEY` is server-only and should be reserved for administrative backend jobs where RLS bypass is explicitly required.

## Domain model

- `profiles`: authenticated user + application role.
- `product_families`: controlled product grouping.
- `products`: permanent part-number record and current revision pointers.
- `product_revisions`: revision lifecycle and Quality approval state.
- `visual_assets`: photo metadata and private storage object path.
- `audit_events`: immutable application audit trail.

## Roles

- `production_operator`: current approved visual references only.
- `quality`: review/approve/reject + history.
- `engineering`: product/revision creation + visual upload.
- `document_control`: controlled metadata/history management.
- `administrator`: configuration and access administration.

## Revision rule

`products.current_engineering_revision` is authoritative for the comparison.

`products.current_approved_visual_revision` is updated only by the Quality approval database function.

If values differ, Production receives a RED mismatch warning. The application does not silently relabel an older visual set as current.

## QR rule

QR payload:

`{APP_URL}/p/{url-encoded-part-number}`

It never includes revision, credentials, signed storage URLs, or sensitive metadata.

## Approval transaction

Quality approval is performed in a single PostgreSQL transaction:

1. Verify caller role.
2. Lock target revision/product.
3. Mark prior approved visual revision obsolete.
4. Approve target revision.
5. Approve target revision's visual assets.
6. Update `products.current_approved_visual_revision`.
7. Write audit events.

This avoids split-brain state between the product and its visual set.
