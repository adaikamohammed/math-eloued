import { test } from "node:test";
import assert from "node:assert/strict";
import {
  encodeFamilyWallet,
  decodeFamilyWallet,
  buildFamilyShareUrl,
  buildWhatsAppShareUrl,
} from "./familyWallet";
import type { SavedTeacher } from "@/components/TeacherWallet";

const sampleTeachers: SavedTeacher[] = [
  {
    slug: "prof-vqnexp",
    name: "محمد عدايكة",
    code: "MTH-704",
    subject: "mathematics",
    school: "متوسطة باهي علي — ولاية الوادي",
    childName: "أحمد بن علي",
    levels: [1, 2],
    savedAt: 1730000000000,
  },
  {
    slug: "prof-arb123",
    name: "أ. خديجة",
    code: "ARB-205",
    subject: "arabic",
    school: "متوسطة باهي علي",
    childName: "سارة",
    levels: [1],
    savedAt: 1730000000000,
  },
];

test("familyWallet: encode and decode with Arabic fidelity", () => {
  const encoded = encodeFamilyWallet(sampleTeachers);
  assert.ok(encoded.length > 20, "encoded string should be non-empty");

  const decoded = decodeFamilyWallet(encoded);
  assert.equal(decoded.length, 2);
  assert.equal(decoded[0].slug, "prof-vqnexp");
  assert.equal(decoded[0].name, "محمد عدايكة");
  assert.equal(decoded[0].school, "متوسطة باهي علي — ولاية الوادي");
  assert.equal(decoded[0].childName, "أحمد بن علي");
  assert.deepEqual(decoded[0].levels, [1, 2]);

  assert.equal(decoded[1].name, "أ. خديجة");
  assert.equal(decoded[1].code, "ARB-205");
  assert.equal(decoded[1].childName, "سارة");
});

test("familyWallet: empty and corrupted inputs return empty array safely", () => {
  assert.equal(encodeFamilyWallet([]), "");
  assert.deepEqual(decodeFamilyWallet(""), []);
  assert.deepEqual(decodeFamilyWallet("not-a-valid-base64-json!"), []);
});

test("familyWallet: buildFamilyShareUrl and buildWhatsAppShareUrl", () => {
  const shareUrl = buildFamilyShareUrl(sampleTeachers, "https://jusoor.dz");
  assert.ok(shareUrl.startsWith("https://jusoor.dz/?import_wallet="));

  const waUrl = buildWhatsAppShareUrl(shareUrl, ["أحمد", "سارة"]);
  assert.ok(waUrl.startsWith("https://api.whatsapp.com/send?text="));
  assert.ok(decodeURIComponent(waUrl).includes("أحمد و سارة"));
  assert.ok(decodeURIComponent(waUrl).includes("https://jusoor.dz/?import_wallet="));
});
