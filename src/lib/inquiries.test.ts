import test from "node:test";
import assert from "node:assert/strict";
import {
  generateTrackingCode,
  generateSecretToken,
  validateInquiryPayload,
  buildWhatsAppReplyUrl,
} from "./inquiries";

test("generateTrackingCode: formats correctly with and without teacherCode", () => {
  const codeWithTeacher = generateTrackingCode("MTH-784");
  assert.match(codeWithTeacher, /^INQ-MTH7-[0-9A-F]{4}$/);

  const codeDefault = generateTrackingCode();
  assert.match(codeDefault, /^INQ-JSR-[0-9A-F]{4}$/);
});

test("generateSecretToken: produces 24-character hex string", () => {
  const token = generateSecretToken();
  assert.equal(token.length, 24);
  assert.match(token, /^[0-9a-f]{24}$/);
});

test("validateInquiryPayload: validates required fields", () => {
  // Empty
  assert.equal(validateInquiryPayload(null).valid, false);

  // Missing fields
  assert.equal(validateInquiryPayload({ parentName: "أ", studentName: "علي", studentGroup: "1م1", content: "سؤال" }).valid, false);
  assert.equal(validateInquiryPayload({ parentName: "أحمد", studentName: "", studentGroup: "1م1", content: "سؤال واضح" }).valid, false);
  assert.equal(validateInquiryPayload({ parentName: "أحمد", studentName: "علي", studentGroup: "", content: "سؤال واضح" }).valid, false);
  assert.equal(validateInquiryPayload({ parentName: "أحمد", studentName: "علي", studentGroup: "1م1", content: "قصير" }).valid, false);

  // Valid payload
  const valid = validateInquiryPayload({
    parentName: "محمد عدايكة",
    studentName: "ريان عدايكة",
    studentGroup: "1م2",
    parentPhone: "0661122334",
    category: "grade",
    content: "السلام عليكم أستاذ، أود الاستفسار عن علامة الفرض الأخير للتلميذ ريان.",
  });

  assert.equal(valid.valid, true);
  assert.equal(valid.cleanData?.parentName, "محمد عدايكة");
  assert.equal(valid.cleanData?.studentName, "ريان عدايكة");
  assert.equal(valid.cleanData?.studentGroup, "1م2");
  assert.equal(valid.cleanData?.parentPhone, "+213661122334");
  assert.equal(valid.cleanData?.category, "grade");
});

test("buildWhatsAppReplyUrl: formats valid WhatsApp click-to-chat URL with Arabic text", () => {
  const url = buildWhatsAppReplyUrl("0661122334", "ريان", "محمد عدايكة", "تم توجيه التلميذ في القسم");
  assert.ok(url.startsWith("https://wa.me/213661122334?text="));
  assert.ok(url.includes(encodeURIComponent("ريان")));
  assert.ok(url.includes(encodeURIComponent("محمد عدايكة")));
});
