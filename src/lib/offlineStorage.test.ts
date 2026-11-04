import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Mock localStorage and window environment for Node.js test runner
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(global as any).localStorage = mockLocalStorage;
(global as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
try {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: false },
    configurable: true,
    writable: true,
  });
} catch {
  try {
    Object.defineProperty(globalThis.navigator, "onLine", {
      value: false,
      configurable: true,
      writable: true,
    });
  } catch {}
}

import {
  getPersistedTeacherSession,
  savePersistedTeacherSession,
  clearPersistedTeacherSession,
  checkTeacherSession,
  type TeacherSession,
} from "./offlineAuth";

import {
  getTeacherOfflineData,
  saveTeacherOfflineData,
  getTeacherPendingSync,
  hasPendingSync,
  clearTeacherPendingSync,
  cacheServerDataLocally,
} from "./offlineStorage";
import type { LessonsData, Lesson } from "./types";

beforeEach(() => {
  storageMap.clear();
  try {
    (globalThis.navigator as any).onLine = false;
  } catch {
    try {
      Object.defineProperty(globalThis.navigator, "onLine", {
        value: false,
        configurable: true,
        writable: true,
      });
    } catch {}
  }
});

test("offlineAuth: saves and retrieves persisted teacher session accurately", () => {
  const mockTeacher: TeacherSession = {
    id: "prof_test_123",
    full_name: "أستاذ الرياضيات التجريبي",
    slug: "prof-math-test",
    teacher_code: "MTH-704",
    school_custom_name: "متوسطة الشهيد باهي علي",
    levels_taught: [1, 2],
    subject: "mathematics",
  };

  savePersistedTeacherSession(mockTeacher);
  const retrieved = getPersistedTeacherSession();

  assert.deepEqual(retrieved, mockTeacher);
});

test("offlineAuth: checkTeacherSession in offline mode maintains authenticated session", async () => {
  const mockTeacher: TeacherSession = {
    id: "prof_test_123",
    full_name: "أستاذ الرياضيات التجريبي",
    slug: "prof-math-test",
    teacher_code: "MTH-704",
    school_custom_name: "متوسطة الشهيد باهي علي",
    levels_taught: [1, 2],
  };

  savePersistedTeacherSession(mockTeacher);
  (global as any).navigator.onLine = false;

  const result = await checkTeacherSession();

  assert.equal(result.authenticated, true);
  assert.equal(result.isOffline, true);
  assert.equal(result.profile?.id, "prof_test_123");
});

test("offlineAuth: clearPersistedTeacherSession removes saved session on explicit logout", () => {
  const mockTeacher: TeacherSession = {
    id: "prof_test_123",
    full_name: "أستاذ الرياضيات",
    slug: "prof-math",
    teacher_code: "MTH-704",
    school_custom_name: "متوسطة",
    levels_taught: [1],
  };

  savePersistedTeacherSession(mockTeacher);
  assert.notEqual(getPersistedTeacherSession(), null);

  clearPersistedTeacherSession();
  assert.equal(getPersistedTeacherSession(), null);
});

test("offlineStorage: saves and retrieves teacher offline JSON data", () => {
  const teacherId = "teacher_456";
  const initialData: Partial<LessonsData> = {
    customClasses: ["1م1", "1م2"],
    lessons: [
      {
        id: "les_1",
        level: 1,
        title: "العمليات على الأعداد الطبيعية والعشرية",
        number: 1,
        createdAt: "2026-11-04T12:00:00Z",
      } as Lesson,
    ],
  };

  saveTeacherOfflineData(teacherId, initialData, true);

  const retrieved = getTeacherOfflineData(teacherId);
  assert.ok(retrieved);
  assert.deepEqual(retrieved?.customClasses, ["1م1", "1م2"]);
  assert.equal(retrieved?.lessons?.length, 1);
  assert.equal(retrieved?.lessons?.[0].title, "العمليات على الأعداد الطبيعية والعشرية");
});

test("offlineStorage: tracks pending changes in queue when offline and clears after sync", () => {
  const teacherId = "teacher_789";

  assert.equal(hasPendingSync(teacherId), false);

  // Teacher adds evaluation grades offline
  saveTeacherOfflineData(
    teacherId,
    {
      gradebookRecords: [
        {
          studentName: "أحمد بن علي",
          className: "1م1",
          trimester: 1,
          continuousScore: 18.5,
        },
      ],
    },
    true
  );

  assert.equal(hasPendingSync(teacherId), true);
  const pending = getTeacherPendingSync(teacherId);
  assert.equal(pending?.gradebookRecords?.length, 1);
  assert.equal(pending?.gradebookRecords?.[0].studentName, "أحمد بن علي");

  // After sync succeeds
  clearTeacherPendingSync(teacherId);
  assert.equal(hasPendingSync(teacherId), false);
  assert.equal(getTeacherPendingSync(teacherId), null);
});

test("offlineStorage: cacheServerDataLocally preserves uncommitted offline changes", () => {
  const teacherId = "teacher_sync_guard";

  // Step 1: Teacher makes an offline edit
  saveTeacherOfflineData(
    teacherId,
    {
      diaryEntries: [
        {
          id: "diary_offline_1",
          date: "2026-11-04",
          day: "الأربعاء",
          className: "1م1",
          lessonTitle: "حصة تم إدخالها دون اتصال",
          createdAt: "2026-11-04T10:00:00Z",
        },
      ],
    },
    true
  );

  // Step 2: Fresh data arrives from server (which does not yet know about the offline entry)
  const serverData: LessonsData = {
    lessons: [],
    customClasses: ["1م1", "1م2"],
    diaryEntries: [],
  };

  const cached = cacheServerDataLocally(teacherId, serverData);

  // Crucial: The pending offline diary entry must NOT be wiped!
  assert.equal(cached.diaryEntries?.length, 1);
  assert.equal(cached.diaryEntries?.[0].lessonTitle, "حصة تم إدخالها دون اتصال");
  assert.deepEqual(cached.customClasses, ["1م1", "1م2"]);
});
