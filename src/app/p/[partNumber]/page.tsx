import Link from "next/link";
import { notFound } from "next/navigation";
import { ReferenceGallery } from "@/components/reference-gallery";
import { StatusBanner } from "@/components/status-banner";
import { getProductReference } from "@/lib/data/products";
import { getReferenceState } from "@/lib/reference-state";
import {
  findPublicPdf,
  listPublicAktSpecifications,
  listPublicAktWiringDiagrams,
  listPublicRevisionControlNotices,
} from "@/lib/public-pdf-documents";

export default async function ProductReferencePage({
  params,
}: {
  params: Promise<{ partNumber: string }>;
}) {
  const { partNumber } = await params;
  const decoded = decodeURIComponent(partNumber);

  const product = await getProductReference(decoded);
  if (!product || product.status !== "active") notFound();

  // Only make a number clickable when its released PDF is actually indexed.
  const [workPdf, finalPdf] = product.current_approved_visual_revision
    ? await Promise.all([
        product.work_instruction_number
          ? findPublicPdf("work-instruction", product.work_instruction_number)
          : null,
        product.final_inspection_part_number
          ? findPublicPdf("final-inspection", product.final_inspection_part_number)
          : null,
      ])
    : [null, null];

  const aktSpecifications = product.current_approved_visual_revision
    ? await listPublicAktSpecifications(product.part_number)
    : [];

  const revisionControlNotices = product.current_approved_visual_revision
    ? await listPublicRevisionControlNotices(product.part_number)
    : [];

  const wiringDiagrams = product.current_approved_visual_revision
    ? await listPublicAktWiringDiagrams(product.part_number)
    : [];

  const state = getReferenceState(
    product.current_engineering_revision,
    product.current_approved_visual_revision,
  );

  return (
    <main className="shell stack">
      <StatusBanner
        state={state}
        engineeringRevision={product.current_engineering_revision}
        approvedVisualRevision={product.current_approved_visual_revision}
      />

      <section className="card">
        <div className="eyebrow">EAGLE TECH MANUFACTURING PRODUCTION REFERENCES</div>
        <div className="muted">PART NUMBER</div>
        <h1>{product.part_number}</h1>
        <h2>{product.description}</h2>
        <dl className="meta">
          <dt>Engineering Revision</dt>
          <dd>{product.current_engineering_revision ?? "Not set"}</dd>
          <dt>Approved Visual Revision</dt>
          <dd>{product.current_approved_visual_revision ?? "None"}</dd>
          <dt>Functional Work Instructions Part Number</dt>
          <dd>
            {workPdf && product.work_instruction_number ? (
              <Link href={`/p/${encodeURIComponent(product.part_number)}/documents/work-instruction`}>
                {product.work_instruction_number} (View PDF)
              </Link>
            ) : (
              product.work_instruction_number ?? "Not set"
            )}
          </dd>
          <dt>AKT Wiring Diagram Part Number</dt>
          <dd>
            {wiringDiagrams.length > 0 ? (
              <div className="stack">
                {wiringDiagrams.map((diagram) => (
                  <Link
                    key={diagram.documentNumber}
                    href={`/p/${encodeURIComponent(product.part_number)}/documents/akt-wiring-diagram/${encodeURIComponent(diagram.documentNumber)}`}
                  >
                    {diagram.documentNumber}
                    {diagram.title ? ` — ${diagram.title}` : ""}
                    {" (View PDF)"}
                  </Link>
                ))}
              </div>
            ) : (
              "Not set"
            )}
          </dd>
          <dt>Final Inspection Part Number</dt>
          <dd>
            {finalPdf && product.final_inspection_part_number ? (
              <Link href={`/p/${encodeURIComponent(product.part_number)}/documents/final-inspection`}>
                {product.final_inspection_part_number} (View PDF)
              </Link>
            ) : (
              product.final_inspection_part_number ?? "Not set"
            )}
          </dd>
        </dl>
      </section>

      <section className="card">
        <div className="eyebrow">ENGINEERING SPECIFICATIONS</div>
        <h2>AKT SPECIFICATION</h2>
        {aktSpecifications.length > 0 ? (
          <div className="stack">
            {aktSpecifications.map((specification) => (
              <Link
                key={specification.documentNumber}
                className="button secondary"
                href={`/p/${encodeURIComponent(product.part_number)}/documents/akt-specification/${encodeURIComponent(specification.documentNumber)}`}
              >
                {specification.documentNumber}
                {specification.title ? ` — ${specification.title}` : ""}
                {" (View PDF)"}
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            No released AKT specification is currently linked to this product.
          </p>
        )}
      </section>

      <section className="card">
        <div className="eyebrow">ENGINEERING REVISION DOCUMENTATION</div>
        <h2>Eagle Tech Revision Control Notice</h2>
        {revisionControlNotices.length > 0 ? (
          <div className="stack">
            {revisionControlNotices.map((notice) => (
              <Link
                key={notice.documentNumber}
                className="button secondary"
                href={`/p/${encodeURIComponent(product.part_number)}/documents/revision-control-notice/${encodeURIComponent(notice.documentNumber)}`}
              >
                {notice.documentNumber}
                {notice.title ? ` — ${notice.title}` : ""}
                {" (View PDF)"}
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            No released Eagle Tech Revision Control Notice is currently linked to this product.
          </p>
        )}
      </section>

      {product.critical_quality_notes ? (
        <section className="card">
          <h2>Critical Quality Notes</h2>
          <p>{product.critical_quality_notes}</p>
        </section>
      ) : null}

      <section className="card">
        <h2>Approved Visual References</h2>
        {product.current_approved_visual_revision ? (
          <ReferenceGallery assets={product.assets} />
        ) : (
          <div className="status danger">
            No approved visual reference is available. Follow released engineering documentation.
          </div>
        )}
      </section>

      <section className="disclaimer">
        PRODUCTION AID — Released engineering documentation remains authoritative.
      </section>
    </main>
  );
}
