# Public PDF previews from QR codes

Only approved PDFs explicitly listed in the index can be previewed by someone scanning a product QR code. No PDF is copied to GitHub or Supabase Storage.

## SERVER04 setup

1. Choose a separate Windows/UNC directory containing ONLY PDFs approved for public QR viewing. Do NOT point to a general internal documents folder containing drafts or restricted files.
2. In the local app's uncommitted `.env.local`, set `PUBLIC_APPROVED_DOCUMENTS_ROOT` to that directory. The app's Windows account needs read permission.
3. Inside that directory, create `public-document-index.json` like the example below. Relative paths are relative to the approved directory; they can include subfolders. Keep only **current released PDFs** in this index:

```json
{
  "work-instruction": {
    "0190-02918": "work-instructions/0190-02918-released.pdf"
  },
  "final-inspection": {
    "0010-00289": "final-inspection/0010-00289-released.pdf"
  }
}
```

4. Copy the matching released PDF files into those subfolders. Restart Next.js after changing `.env.local`.
5. QR pages link a document number only when an indexed PDF exists. The preview page embeds the PDF with a direct-open option for mobile browsers.

## Access safeguards

The PDF route rechecks the actual product status and current approved visual revision before selecting its assigned document number. It can only serve files present in the explicit released-file index, under the configured directory; it rejects paths escaping that directory. The PDF response is uncached. Any person who can view the public QR page can also view its indexed released PDFs, so publish **only documents cleared for that audience**.

This is an initial file-based document index. A later Document Control dashboard can manage approvals, upload revisions and publish/unpublish mappings without manual JSON editing.
