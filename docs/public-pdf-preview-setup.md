# Public PDF previews from QR codes

Only approved PDFs explicitly listed in the index can be previewed by someone scanning a product QR code. No PDF is copied to GitHub or Supabase Storage.

## SERVER04 setup

1. Use a separate Windows/UNC directory containing ONLY PDFs approved for public QR viewing. Do NOT point to a general internal documents folder containing drafts or restricted files.
2. In the local app's uncommitted `.env.local`, set `PUBLIC_APPROVED_DOCUMENTS_ROOT` to that directory. The app's Windows account needs read permission.
3. Recommended released-document folders:

```text
PublicQR
├── final-inspection
├── work-instructions
├── akt-specification
├── revision-control-notice
├── akt-wiring-diagram
└── public-document-index.json
```

4. Keep only **current released PDFs** in the public index. Existing Final Inspection and Functional Work Instructions are mapped by document number. AKT specifications are mapped by product part number and can contain multiple specifications:

```json
{
  "work-instruction": {
    "0008-00180": "work-instructions/0008-00180-released.pdf"
  },
  "final-inspection": {
    "0010-00289": "final-inspection/(0010-00289) 0190-02918-001 G8.7 VME POWER BOX1.pdf"
  },
  "akt-specification": {
    "0190-02918": [
      {
        "document_number": "AKT-12345",
        "title": "Electrical Specification",
        "file": "akt-specification/AKT-12345 Electrical Specification.pdf"
      }
    ]
  },
  "revision-control-notice": {
    "0190-02918": [
      {
        "document_number": "RCN-12345",
        "title": "Engineering Revision Notice",
        "file": "revision-control-notice/RCN-12345 Engineering Revision Notice.pdf"
      }
    ]
  },
  "akt-wiring-diagram": {
    "0190-02918": [
      {
        "document_number": "0190-02918-WD",
        "title": "Wiring Diagram",
        "file": "akt-wiring-diagram/0190-02918-WD Wiring Diagram.pdf"
      }
    ]
  }
}
```

5. Copy the matching released PDF files into those subfolders.
6. The public QR page displays **AKT SPECIFICATION**, **Eagle Tech Revision Control Notice**, and **AKT Wiring Diagram Part Number** sections. Only indexed entries whose PDF file exists and passes the approved-folder checks are shown as links.
7. The Create Product form can upload one optional AKT Specification PDF, one optional Revision Control Notice PDF, and one optional AKT Wiring Diagram PDF. The app creates the SERVER04 subfolders automatically as needed.
8. Each uploaded PDF is limited to 12 MB; the overall Create Product form is configured for up to 48 MB.
9. Preview pages embed the PDFs and also provide **Open PDF directly** for mobile browsers.

## Access safeguards

The PDF routes recheck that the product is active and has a current approved visual revision. Files can only be served when explicitly listed in the released-file index and located under the configured approved directory. Path traversal, absolute paths, non-PDF files, and files outside the approved directory are rejected. PDF responses are uncached.

Any person who can view the public QR page can also view its indexed released PDFs, so publish **only documents cleared for that audience**.

This is an initial file-based document index. A later Document Control dashboard can manage approvals, upload revisions, and publish/unpublish mappings without manual JSON editing.
