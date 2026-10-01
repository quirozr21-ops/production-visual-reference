import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductReference } from "@/lib/data/products";
import { listPublicRevisionControlNotices } from "@/lib/public-pdf-documents";

export const dynamic = "force-dynamic";

export default async function RevisionControlNoticePreview({
  params,
}: {
  params: Promise<{ partNumber: string; documentNumber: string }>;
}) {
  const { partNumber, documentNumber } = await params;
  const product = await getProductReference(partNumber);

  if (
    !product ||
    product.status !== "active" ||
    !product.current_approved_visual_revision
  ) {
    notFound();
  }

  const notices = await listPublicRevisionControlNotices(product.part_number);
  const notice = notices.find(
    (candidate) => candidate.documentNumber === documentNumber,
  );
  if (!notice) notFound();

  const source = `/api/public-documents/${encodeURIComponent(product.part_number)}/revision-control-notice/${encodeURIComponent(notice.documentNumber)}`;

  return (
    <main className="shell stack">
      <section className="card stack">
        <Link
          className="button secondary"
          href={`/p/${encodeURIComponent(product.part_number)}`}
        >
          Back to Production References
        </Link>

        <div>
          <div className="eyebrow">ENGINEERING REVISION DOCUMENTATION</div>
          <h1>Eagle Tech Revision Control Notice</h1>
          <p className="muted">
            Document {notice.documentNumber}
            {notice.title ? ` · ${notice.title}` : ""}
            {" · "}Product {product.part_number}
          </p>
        </div>

        <a
          className="button"
          href={source}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open PDF directly
        </a>

        <iframe
          title={`Eagle Tech Revision Control Notice ${notice.documentNumber} PDF preview`}
          src={source}
          style={{
            width: "100%",
            height: "75vh",
            minHeight: "420px",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          }}
        />

        <p className="muted">
          If your phone does not display the embedded PDF, tap Open PDF directly.
        </p>

        <p className="disclaimer">
          Verify that this is the current released Revision Control Notice before use.
        </p>
      </section>
    </main>
  );
}
