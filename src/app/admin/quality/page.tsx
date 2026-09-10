import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getApprovalQueue } from "@/lib/data/revisions";

export default async function QualityQueuePage() {
  await requireRole(["quality", "administrator"]);
  const queue = await getApprovalQueue();

  return (
    <main className="shell stack">
      <Link href="/admin">← Dashboard</Link>
      <section className="card">
        <div className="eyebrow">QUALITY CONTROL</div>
        <h1>Approval Queue</h1>
        <p className="muted">Review all images and quality notes before approving a visual revision for Production.</p>
      </section>

      {queue.length === 0 ? (
        <section className="card"><h2>Queue clear</h2><p className="muted">No visual revisions are awaiting Quality approval.</p></section>
      ) : (
        <div className="stack">
          {queue.map((item) => (
            <section className="card" key={item.id}>
              <div className="toolbar">
                <div>
                  <div className="eyebrow">AWAITING APPROVAL</div>
                  <h2>{item.product.part_number} — Rev {item.revision_code}</h2>
                  <p>{item.product.description}</p>
                  <div className="muted">
                    {item.asset_count} photo{item.asset_count === 1 ? "" : "s"} · {item.ecn_number ? `ECN ${item.ecn_number}` : "No ECN"}
                    {item.submitted_at ? ` · Submitted ${new Date(item.submitted_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <Link className="button" href={`/admin/revisions/${item.id}`}>Review Revision</Link>
              </div>
              {item.critical_quality_notes ? <div className="note-box"><strong>Critical Quality Notes</strong><p>{item.critical_quality_notes}</p></div> : null}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
