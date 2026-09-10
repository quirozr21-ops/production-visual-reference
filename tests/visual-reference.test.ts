import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedImageType,
  isPhotoCategory,
  MAX_REFERENCE_IMAGE_BYTES,
  safeFileName,
} from "../src/lib/visual-reference.ts";

test("photo category validation accepts controlled values", () => {
  assert.equal(isPhotoCategory("Connector"), true);
  assert.equal(isPhotoCategory("Random Category"), false);
});

test("file name sanitizer removes path and unsafe characters", () => {
  assert.equal(safeFileName("../Rear Panel #1.JPG"), "Rear-Panel-1.JPG");
});

test("image MIME allowlist excludes non-images", () => {
  assert.equal(isAllowedImageType("image/jpeg"), true);
  assert.equal(isAllowedImageType("application/pdf"), false);
});

test("reference image size limit remains 12 MB", () => {
  assert.equal(MAX_REFERENCE_IMAGE_BYTES, 12 * 1024 * 1024);
});
