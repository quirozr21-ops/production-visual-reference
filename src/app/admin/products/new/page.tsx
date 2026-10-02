import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { createProduct } from "../actions";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["engineering", "document_control", "administrator"]);
  const params = await searchParams;

  return (
    <main className="shell stack">
      <Link href="/admin">← Dashboard</Link>
      <section className="card" style={{ maxWidth: 720 }}>
        <h1>Create Product Record</h1>
        <p className="muted">
          Create the permanent part-number record. The engineering revision is tracked separately from the approved visual revision.
        </p>

        {isDemoMode ? (
          <div className="status warning">
            Demo mode is active. Configure Supabase and disable demo mode before creating controlled records.
          </div>
        ) : null}

        {params.error ? <div className="status danger">{params.error}</div> : null}

        <form action={createProduct} className="search-form" style={{ marginTop: 18 }}>
          <label>
            Part Number
            <input className="input" name="partNumber" required placeholder="0241-75484" />
          </label>
          <label>
            Description
            <input className="input" name="description" required placeholder="Quick Connect Assembly" />
          </label>
          <label>
            Current Engineering Revision
            <input className="input" name="engineeringRevision" required placeholder="5" />
          </label>
          <label>
            Functional Work Instructions Part Number
            <input className="input" name="workInstruction" placeholder="0008-xxxxx" />
          </label>
          <label>
            Final Inspection Part Number
            <input className="input" name="finalInspectionPartNumber" placeholder="0010-xxxxx" />
          </label>

          <div className="note-box">
            <strong>AKT SPECIFICATION — Optional</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              Upload one released engineering-specification PDF while creating this product.
              The PDF will be stored on SERVER04 and linked to this product&apos;s public QR page.
            </div>
          </div>

          <label>
            AKT Specification Document Number
            <input
              className="input"
              name="aktDocumentNumber"
              placeholder="0190-02918-001"
            />
          </label>
          <label>
            AKT Specification Title
            <input
              className="input"
              name="aktTitle"
              placeholder="Rev. 2 Specification"
            />
          </label>
          <label>
            AKT Specification PDF
            <input
              className="input"
              name="aktSpecificationFile"
              type="file"
              accept=".pdf,application/pdf"
            />
          </label>
          <p className="muted">
            PDF only, maximum 12 MB. Enter the AKT document number when selecting a PDF.
          </p>

          <div className="note-box">
            <strong>Eagle Tech Revision Control Notice — Optional</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              Upload one released Revision Control Notice PDF while creating this product.
              The PDF will be stored on SERVER04 and linked to this product&apos;s public QR page.
            </div>
          </div>

          <label>
            Revision Control Notice Number
            <input
              className="input"
              name="revisionNoticeNumber"
              placeholder="RCN-xxxxx"
            />
          </label>
          <label>
            Revision Control Notice Title
            <input
              className="input"
              name="revisionNoticeTitle"
              placeholder="Revision notice title"
            />
          </label>
          <label>
            Revision Control Notice PDF
            <input
              className="input"
              name="revisionNoticeFile"
              type="file"
              accept=".pdf,application/pdf"
            />
          </label>
          <p className="muted">
            PDF only, maximum 12 MB. Enter the Revision Control Notice number when selecting a PDF.
          </p>

          <div className="note-box">
            <strong>AKT Wiring Diagram Part Number — Optional</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              The wiring diagram part number can be saved without a PDF.
              Upload the released PDF now, or add it later from Edit Product Details.
            </div>
          </div>

          <label>
            AKT Wiring Diagram Part Number
            <input
              className="input"
              name="wiringDiagramNumber"
              placeholder="0190-xxxxx-xxx"
            />
          </label>
          <label>
            AKT Wiring Diagram Title
            <input
              className="input"
              name="wiringDiagramTitle"
              placeholder="Wiring Diagram"
            />
          </label>
          <label>
            AKT Wiring Diagram PDF
            <input
              className="input"
              name="wiringDiagramFile"
              type="file"
              accept=".pdf,application/pdf"
            />
          </label>
          <p className="muted">
            PDF upload is optional and can be added later. PDF only, maximum 12 MB.
          </p>

          <button className="button" type="submit" disabled={isDemoMode}>
            Create Product
          </button>
        </form>
      </section>
    </main>
  );
}
