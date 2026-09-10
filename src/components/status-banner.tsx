import type { ReferenceState } from "@/lib/reference-state";

export function StatusBanner({
  state,
  engineeringRevision,
  approvedVisualRevision,
}: {
  state: ReferenceState;
  engineeringRevision: string | null;
  approvedVisualRevision: string | null;
}) {
  if (state === "CURRENT") {
    return (
      <div className="status success" role="status">
        ✓ GREEN — CURRENT APPROVED VISUAL REFERENCE
      </div>
    );
  }

  if (state === "MISMATCH") {
    return (
      <div className="status danger" role="alert">
        ⚠ RED — VISUAL REFERENCE REVISION MISMATCH
        <div style={{ fontWeight: 500, marginTop: 8 }}>
          Engineering revision {engineeringRevision} does not match approved visual revision {approvedVisualRevision}. Refer to released engineering documentation until Quality approves the updated visual reference.
        </div>
      </div>
    );
  }

  return (
    <div className="status warning" role="alert">
      ⚠ NO CURRENT APPROVED VISUAL REFERENCE
      <div style={{ fontWeight: 500, marginTop: 8 }}>
        Refer to released engineering documentation.
      </div>
    </div>
  );
}
