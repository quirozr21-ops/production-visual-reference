import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { getRevisionDetail } from "@/lib/data/revisions";
import { PHOTO_CATEGORIES } from "@/lib/visual-reference";
import {
  approveVisualRevision,
  deleteVisualAsset,
  rejectVisualRevision,
  submitRevisionForQuality,
  updateRevisionMetadata,
  uploadVisualAsset,
} from "../actions";

function workflowLabel(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

export default async function RevisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ revisionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["quality", "engineering", "document_control", "administrator"]);
  const [{ revisionId }, query] = await Promise.all([params, searchParams]);
  const revision = await getRevisionDetail(revisionId);
  if (!revision) notFound();

  const canAuthor = user.role === "engineering" || user.role === "administrator";
  const canQuality = user.role === "quality" || user.role === "administrator";
  const editable = canAuthor && ["draft", "rejected"].includes(revision.status);
  const pending = revision.status === "awaiting_approval";
  const message = typeof query.error === "string"
    ? { kind: "danger", text: query.error }
    : query.uploaded
      ? { kind: "success", text: "Reference image uploaded." }
      : query.saved
        ? { kind: "success", text: "Revision details saved." }
        : query.submitted
          ? { kind: "success", text: "Revision submitted to Quality." }
          : query.approved
            ? { kind: "success", text: "Quality approved this visual revision." }
            : query.rejected
              ? { kind: "warning", text: "Quality rejected this revision for correction." }
              : null;

  return (
    <main className="shell stack">
      <div className="toolbar">
        <Link href={`/admin/products/${revision.product.id}`}>← {revision.product.part_number}</Link>
        <Link href={`/admin/products/${revision.product.id}/history`}>Revision History</Link>
      </div>

      <section className="card">
        <div className="toolbar">
          <div>
            <div className="eyebrow">CONTROLLED VISUAL REVISION</div>
            <h1>{revision.product.part_number} — Rev {revision.revision_code}</h1>
            <h2>{revision.product.description}</h2>
          </div>
          <div className={`status compact ${revision.status === "approved" ? "success" : revision.status === "rejected" ? "danger" : revision.status === "awaiting_approval" ? "warning" : "neutral"}`}>
            {workflowLabel(revision.status)}
          </div>
        </div>
        <dl className="meta" style={{ marginTop: 18 }}>
          <dt>Current Engineering Rev</dt><dd>{revision.product.current_engineering_revision ?? "—"}</dd>
          <dt>Current Approved Visual</dt><dd>{revision.product.current_approved_visual_revision ?? "None"}</dd>
          <dt>ECN</dt><dd>{revision.ecn_number ?? "—"}</dd>
          <dt>Photos</dt><dd>{revision.asset_count}</dd>
        </dl>
        {revision.rejection_reason ? <div className="status danger" style={{ marginTop: 16 }}>Rejection reason: {revision.rejection_reason}</div> : null}
        {message ? <div className={`status ${message.kind}`} style={{ marginTop: 16 }}>{message.text}</div> : null}
        {isDemoMode ? <div className="status warning" style={{ marginTop: 16 }}>Demo mode is read-only; workflow buttons are disabled.</div> : null}
      </section>

      <section className="card">
        <h2>Revision Information</h2>
        {editable ? (
          <form action={updateRevisionMetadata} className="search-form">
            <input type="hidden" name="revisionId" value={revision.id} />
            <label>
              ECN Number
              <input className="input" name="ecnNumber" defaultValue={revision.ecn_number ?? ""} />
            </label>
            <label>
              Critical Quality Notes
              <textarea className="input textarea" rows={5} name="criticalQualityNotes" defaultValue={revision.critical_quality_notes ?? ""} />
            </label>
            <button className="button secondary" disabled={isDemoMode}>Save Revision Information</button>
          </form>
        ) : (
          <div className="note-box">
            <strong>Critical Quality Notes</strong>
            <p>{revision.critical_quality_notes || "No critical quality notes recorded."}</p>
          </div>
        )}
      </section>

      <section className="card">
        <div className="toolbar">
          <div><h2>Visual Reference Images</h2><p className="muted">All images remain private and inherit controlled revision access.</p></div>
          <span className="pill">{revision.asset_count} total</span>
        </div>

        {revision.assets.length === 0 ? <p className="muted">No images uploaded yet.</p> : (
          <div className="gallery" style={{ marginTop: 16 }}>
            {revision.assets.map((asset) => (
              <article className="photo-card" key={asset.id}>
                {asset.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.image_url} alt={asset.description || `${asset.category} reference`} />
                ) : <div className="photo-placeholder">{asset.category}</div>}
                <div className="photo-caption stack" style={{ gap: 6 }}>
                  <div className="photo-category">{asset.category}</div>
                  <div>{asset.description || "No description"}</div>
                  <div className="muted">Image status: {asset.approval_status}</div>
                  {editable ? (
                    <form action={deleteVisualAsset}>
                      <input type="hidden" name="revisionId" value={revision.id} />
                      <input type="hidden" name="assetId" value={asset.id} />
                      <button className="text-button danger-text" type="submit" disabled={isDemoMode}>Remove image</button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editable ? (
        <section className="card">
          <h2>Upload Reference Image</h2>
          <p className="muted">Maximum 12 MB. Accepted: JPEG, PNG, WebP, HEIC, HEIF.</p>
          <form action={uploadVisualAsset} className="search-form">
            <input type="hidden" name="revisionId" value={revision.id} />
            <label>
              Photo Category
              <select className="input" name="category" required defaultValue="Overall">
                {PHOTO_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Description
              <input className="input" name="description" placeholder="Connector orientation viewed from rear panel" />
            </label>
            <label>
              Display Order
              <input className="input" name="sortOrder" type="number" min="0" defaultValue="0" />
            </label>
            <label>
              Image
              <input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required />
            </label>
            <button className="button" type="submit" disabled={isDemoMode}>Upload Private Reference</button>
          </form>
        </section>
      ) : null}

      {editable ? (
        <section className="card control-panel">
          <h2>Submit to Quality</h2>
          <p>Submitting locks Engineering editing while Quality reviews the complete revision.</p>
          <form action={submitRevisionForQuality}>
            <input type="hidden" name="revisionId" value={revision.id} />
            <button className="button" type="submit" disabled={isDemoMode || revision.asset_count === 0}>Submit Revision for Quality Review</button>
          </form>
          {revision.asset_count === 0 ? <p className="muted">At least one reference image is required before submission.</p> : null}
        </section>
      ) : null}

      {pending && canQuality ? (
        <section className="card control-panel">
          <div className="eyebrow">QUALITY DISPOSITION</div>
          <h2>Approve or Reject</h2>
          <p>Approval makes this revision the current Production visual reference and obsoletes the previously approved visual revision.</p>
          <div className="two-column">
            <form action={approveVisualRevision} className="stack">
              <input type="hidden" name="revisionId" value={revision.id} />
              <button className="button approve-button" type="submit" disabled={isDemoMode}>Approve Visual Revision</button>
            </form>
            <form action={rejectVisualRevision} className="stack">
              <input type="hidden" name="revisionId" value={revision.id} />
              <label>
                Rejection reason
                <textarea className="input textarea" name="reason" rows={3} required minLength={3} placeholder="Describe what Engineering must correct." />
              </label>
              <button className="button reject-button" type="submit" disabled={isDemoMode}>Reject for Correction</button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="disclaimer">PRODUCTION AID — Released engineering documentation remains authoritative.</section>
    </main>
  );
}
