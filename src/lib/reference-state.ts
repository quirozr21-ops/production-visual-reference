export type ReferenceState = "CURRENT" | "MISMATCH" | "MISSING";

export function getReferenceState(
  engineeringRevision: string | null | undefined,
  approvedVisualRevision: string | null | undefined,
): ReferenceState {
  if (!engineeringRevision || !approvedVisualRevision) return "MISSING";
  return engineeringRevision.trim().toUpperCase() === approvedVisualRevision.trim().toUpperCase()
    ? "CURRENT"
    : "MISMATCH";
}

export type RevisionWorkflowStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "obsolete";

export type AppRole =
  | "production_operator"
  | "quality"
  | "engineering"
  | "document_control"
  | "administrator";

export function canTransitionRevision(
  role: AppRole,
  from: RevisionWorkflowStatus,
  to: RevisionWorkflowStatus,
): boolean {
  if (role === "administrator") return true;

  if (role === "engineering") {
    return (
      (from === "draft" && to === "awaiting_approval") ||
      (from === "rejected" && to === "draft") ||
      (from === "rejected" && to === "awaiting_approval")
    );
  }

  if (role === "quality") {
    return (
      from === "awaiting_approval" &&
      (to === "approved" || to === "rejected")
    );
  }

  return false;
}
