import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionRevision,
  getReferenceState,
} from "../src/lib/reference-state.ts";
import { buildPermanentProductUrl } from "../src/lib/qr.ts";

test("matching revisions are current", () => {
  assert.equal(getReferenceState("5", "5"), "CURRENT");
  assert.equal(getReferenceState("rev 5", "REV 5"), "CURRENT");
});

test("different revisions produce mismatch", () => {
  assert.equal(getReferenceState("6", "5"), "MISMATCH");
});

test("missing approved reference is never current", () => {
  assert.equal(getReferenceState("6", null), "MISSING");
});

test("engineering can submit but cannot approve", () => {
  assert.equal(canTransitionRevision("engineering", "draft", "awaiting_approval"), true);
  assert.equal(canTransitionRevision("engineering", "awaiting_approval", "approved"), false);
});

test("quality can approve or reject a pending revision", () => {
  assert.equal(canTransitionRevision("quality", "awaiting_approval", "approved"), true);
  assert.equal(canTransitionRevision("quality", "awaiting_approval", "rejected"), true);
});

test("production cannot change controlled revision state", () => {
  assert.equal(canTransitionRevision("production_operator", "draft", "approved"), false);
});

test("QR target is permanent and contains no revision", () => {
  const url = buildPermanentProductUrl("https://visual.company.com/", "0241-75484");
  assert.equal(url, "https://visual.company.com/p/0241-75484");
  assert.equal(url.includes("rev"), false);
  assert.equal(url.includes("revision"), false);
});

test("QR helper safely encodes part numbers", () => {
  const url = buildPermanentProductUrl("https://visual.company.com", "ABC 123/4");
  assert.equal(url, "https://visual.company.com/p/ABC%20123%2F4");
});
