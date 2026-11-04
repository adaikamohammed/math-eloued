import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateLevelToken,
  getTeacherLevelCode,
  parseTeacherInputCode,
  verifyLevelToken,
} from "./teacherCodes";

test("generateLevelToken: produces distinct and unpredictable tokens for each level", () => {
  const teacherCode = "MTH-704";
  const tokenL1 = generateLevelToken(teacherCode, 1);
  const tokenL2 = generateLevelToken(teacherCode, 2);
  const tokenL3 = generateLevelToken(teacherCode, 3);
  const tokenL4 = generateLevelToken(teacherCode, 4);

  // كل توكن طوله 3 أحرف
  assert.equal(tokenL1.length, 3);
  assert.equal(tokenL2.length, 3);
  assert.equal(tokenL3.length, 3);
  assert.equal(tokenL4.length, 3);

  // لا يوجد توكنان متطابقان
  const set = new Set([tokenL1, tokenL2, tokenL3, tokenL4]);
  assert.equal(set.size, 4);

  // التأكد من أنها ليست مجرد إضافة رقم 1 أو 2
  assert.notEqual(tokenL1, tokenL2);
  assert.notEqual(tokenL2, tokenL3);
});

test("parseTeacherInputCode: parses secure level codes accurately", () => {
  const teacherCode = "MTH-704";
  const codeL1 = getTeacherLevelCode(teacherCode, 1);
  const parsed1 = parseTeacherInputCode(codeL1);

  assert.equal(parsed1.baseCode, "MTH-704");
  assert.equal(parsed1.level, 1);
  assert.equal(parsed1.isLockedToLevel, true);

  const codeL4 = getTeacherLevelCode(teacherCode, 4);
  const parsed4 = parseTeacherInputCode(codeL4);
  assert.equal(parsed4.baseCode, "MTH-704");
  assert.equal(parsed4.level, 4);
  assert.equal(parsed4.isLockedToLevel, true);
});

test("parseTeacherInputCode: handles general codes without level lock", () => {
  const parsed = parseTeacherInputCode("MTH-704");
  assert.equal(parsed.baseCode, "MTH-704");
  assert.equal(parsed.level, null);
  assert.equal(parsed.isLockedToLevel, false);
});

test("parseTeacherInputCode: supports legacy -1, -2 codes for backward compatibility", () => {
  const parsed = parseTeacherInputCode("MTH-704-2");
  assert.equal(parsed.baseCode, "MTH-704");
  assert.equal(parsed.level, 2);
  assert.equal(parsed.isLockedToLevel, true);
});

test("verifyLevelToken: validates correct token and rejects invalid tokens", () => {
  const teacherCode = "MTH-704";
  const codeL1 = getTeacherLevelCode(teacherCode, 1);

  assert.equal(verifyLevelToken(teacherCode, 1, codeL1), true);
  // محاولة التحقق من المستوى 2 برمز المستوى 1 تفشل
  assert.equal(verifyLevelToken(teacherCode, 2, codeL1), false);
  // رمز وهمي يفشل
  assert.equal(verifyLevelToken(teacherCode, 1, "MTH-704-XYZ"), false);
});

test("parseTeacherInputCode: handles spaces around hyphens and separators gracefully", () => {
  const parsed1 = parseTeacherInputCode("MTH - 704 - 8EX");
  assert.equal(parsed1.baseCode, "MTH-704");
  assert.equal(parsed1.level, 1);
  assert.equal(parsed1.isLockedToLevel, true);

  const parsed2 = parseTeacherInputCode("MTH 704 8EX");
  assert.equal(parsed2.baseCode, "MTH-704");
  assert.equal(parsed2.level, 1);
  assert.equal(parsed2.isLockedToLevel, true);
});
