import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageLightbox } from "@/components/image-lightbox";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { formatPhotoCategory } from "@/lib/photo-category";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_CATEGORIES } from "@/lib/visual-reference";
import {
  approveVisualRevision,
  deleteVisualAsset,
  rejectVisualRevision,
  submitRevisionForQuality,
  updateRevisionMetadata,
  uploadVisualAsset,
} from "../actions";

type PageProps = {
  params: Promise<{ revisionId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RevisionPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { revisionId } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const { data: revision } = await supabase
    .from("product_revisions")
    .select("id,revision_code,ecn_number,critical_quality_notes,status,approval_date,rejection_reason,created_at,product_id,products(part_number,description,current_engineering_revision,current_approved_visual_revision_id)")
    .eq("id", revisionId)
    .single();

  if (!revision) notFound();

  const { data: assets = [] } = await supabase
    .from("visual_assets")
    .select("id,category,description,sort_order,approval_status,storage_path")
    .eq("revision_id", revision.id)
    .order("sort_order", { ascending: true });

  const role = user.profile.app_role;
  const canEngineer = role === "engineering" || role === "administrator";
  const canQuality = role === "quality" || role === "administrator";
  const editable = canEngineer && ["draft", "rejected"].includes(revision.status);
  const pending = revision.status === "pending_quality";
  const productRelation = revision.products as unknown as
    | { part_number: string; description: string; current_engineering_revision: string | null; current_approved_visual_revision_id: string | null }
    | Array<{ part_number: string; description: string; current_engineering_revision: string | null; current_approved_visual_revision_id: string | null }>;
  const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
  if (!product) notFound();

  const assetCount = assets?.length ?? 0;
  const currentApproved = product.current_approved_visual_revision_id === revision.id;
  const engineeringMatch = product.current_engineering_revision === revision.revision_code;
  const successMessage = query.uploaded
    ? "Reference image uploaded."
    : query.saved
      ? "Revision metadata saved."
      : query.submitted
        ? "Revision submitted to Quality."
        : query.approved
          ? "Visual revision approved."
          : query.rejected
            ? "Revision rejected for correction."
            : null;
  const errorMessage = typeof query.error === "string" ? query.error : null;

  return (
    <main className="page-shell stack-lg">
      <div className="page-header">
        <div>
          <div className="eyebrow">CONTROLLED VISUAL REVISION</div>
          <h1>{product.part_number} — Visual Rev {revision.revision_code}</h1>
          <p>{product.description}</p>
        </div>
        <div className="header-actions">
          <StatusBadge status={revision.status} />
          <Link className="button secondary" href={`/admin/products/${revision.product_id}`}>Back to Product</Link>
        </div>
      </div>

      {successMessage ? <div className="notice success">{successMessage}</div> : null}
      {errorMessage ? <div className="notice error">{errorMessage}</div> : null}

      <section className="card">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">REVISION CONTROL</div>
            <h2>Engineering vs. Visual</h2>
          </div>
          <StatusBadge status={revision.status} />
        </div>
        {currentApproved && engineeringMatch ? (
          <div className="revision-banner revision-match">CURRENT APPROVED VISUAL REFERENCE</div>
        ) : currentApproved ? (
          <div className="revision-banner revision-mismatch">VISUAL REFERENCE REVISION MISMATCH</div>
        ) : null}
        <div className="detail-grid">
          <div><strong>Engineering Revision</strong><span>{product.current_engineering_revision || "—"}</span></div>
          <div><strong>Visual Revision</strong><span>{revision.revision_code}</span></div>
          <div><strong>ECN</strong><span>{revision.ecn_number || "—"}</span></div>
          <div><strong>Approval Date</strong><span>{revision.approval_date ? new Date(revision.approval_date).toLocaleString() : "—"}</span></div>
          <div><strong>Reference Images</strong><span>{assetCount}</span></div>
        </div>
      </section>

      <section className="card">
        <h2>Critical Quality Notes</h2>
        {editable ? (
          <form action={updateRevisionMetadata} className="stack">
            <input type="hidden" name="revisionId" value={revision.id} />
            <label>
              ECN Number
              <input className="input" name="ecnNumber" defaultValue={revision.ecn_number ?? ""} />
            </label>
            <label>
              Critical Quality Notes
              <textarea className="input textarea" name="criticalQualityNotes" rows={5} defaultValue={revision.critical_quality_notes ?? ""} />
            </label>
            <button className="button" type="submit" disabled={isDemoMode}>Save Revision Metadata</button>
          </form>
        ) : (
          <p>{revision.critical_quality_notes || "No critical quality notes."}</p>
        )}
        {revision.rejection_reason ? <div className="notice error"><strong>Rejection:</strong> {revision.rejection_reason}</div> : null}
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">VISUAL REFERENCES</div>
            <h2>Revision Images</h2>
          </div>
          <span className="muted">{assetCount} image{assetCount === 1 ? "" : "s"}</span>
        </div>
        {!assets || assets.length === 0 ? (
          <p className="muted">No reference images uploaded yet.</p>
        ) : (
          <div className="image-grid">
            {assets.map((asset) => (
              <article className="image-card" key={asset.id}>
                <ImageLightbox
                  src={`/api/reference-images/${asset.id}`}
                  alt={`${formatPhotoCategory(asset.category)} reference image`}
                  label={formatPhotoCategory(asset.category)}
                />
                <div className="image-card-body stack-sm">
                  <div className="eyebrow">{formatPhotoCategory(asset.category)}</div>
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
          <p className="muted">Maximum 12 MB. Accepted: JPEG, PNG, WebP, HEIC, HEIF. HEIC/HEIF images are converted to JPEG automatically.</p>
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
              <input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" required />
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
            <button className="button" type="submit" disabled={isDemoMode || assetCount === 0}>Submit Revision for Quality Review</button>
          </form>
          {assetCount === 0 ? <p className="muted">At least one reference image is required before submission.</p> : null}
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
