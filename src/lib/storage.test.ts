import { test } from "node:test";
import assert from "node:assert/strict";
import { ConflictError, getLessonsData, removeStudent, saveLessonsData } from "./storage";
import type { TeacherContext } from "./auth";

// قاعدة بيانات وهمية في الذاكرة تحاكي ما يستعمله storage.ts من supabase-js (select / update / insert)
function fakeDb() {
  const tables: Record<string, Map<string, { teacher_id: string; data: any; updated_at: string }>> = {
    teacher_public_data: new Map(),
    teacher_private_data: new Map(),
  };
  let clock = 0;
  const stamp = () => `2026-01-01T00:00:00.${String(++clock).padStart(6, "0")}+00:00`;

  const from = (table: string) => {
    const rows = tables[table];
    const filters: Record<string, string> = {};
    let patch: any = null;
    const matching = () => [...rows.values()].filter((r) => Object.entries(filters).every(([k, v]) => (r as any)[k] === v));
    const q: any = {
      select: () => q,
      eq: (k: string, v: string) => ((filters[k] = v), q),
      update: (p: any) => ((patch = p), q),
      maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
      insert: async (row: any) => {
        if (rows.has(row.teacher_id)) return { error: { code: "23505", message: "duplicate" } };
        rows.set(row.teacher_id, { ...row, updated_at: stamp() });
        return { error: null };
      },
      then: (resolve: any) => {
        const hit = matching();
        for (const r of hit) Object.assign(r, patch, { updated_at: stamp() });
        resolve({ data: hit, error: null });
      },
    };
    return q;
  };
  return { from, tables };
}

const TEACHER = "00000000-0000-0000-0000-000000000001";

test("deletes stick, and a write that lands between read and save is never erased", async () => {
  const db = fakeDb();
  const ctx = { supabase: db, teacherId: TEACHER, mode: "owner" } as unknown as TeacherContext;

  // بداية: درس واحد وتلميذ واحد
  let data = await getLessonsData(ctx);
  data.lessons.push({ id: "l1", level: 1, number: 1, title: "درس", createdAt: "", images: [] } as any);
  data.studentRoster!.push({ id: "r1", studentName: "أحمد", className: "1م1", groupName: "فوج 1" });
  await saveLessonsData(ctx, data);
  assert.equal((await getLessonsData(ctx)).evaluations!.length, 1); // المزامنة أنشأت تقييمه

  // 1) حذف آخر درس يبقى محذوفاً
  data = await getLessonsData(ctx);
  data.lessons = [];
  await saveLessonsData(ctx, data);
  assert.equal((await getLessonsData(ctx)).lessons.length, 0);

  // 2) حذف التلميذ يبقى محذوفاً في القائمة والتقويم
  data = await getLessonsData(ctx);
  removeStudent(data, "أحمد", "1م1");
  await saveLessonsData(ctx, data);
  const after = await getLessonsData(ctx);
  assert.equal(after.studentRoster!.length, 0);
  assert.equal(after.evaluations!.length, 0);

  // 3) رسالة مجهولة تصل بين القراءة والحفظ: الحفظ يُرفض بدل محو الرسالة
  const stale = await getLessonsData(ctx);
  const priv = db.tables.teacher_private_data.get(TEACHER)!;
  priv.data = { ...priv.data, anonymousMessages: [{ id: "m1", content: "شكراً" }] };
  priv.updated_at = "2026-01-02T00:00:00.000000+00:00";
  stale.penalties!.push({ id: "p1" } as any);
  await assert.rejects(saveLessonsData(ctx, stale), ConflictError);
  assert.equal((await getLessonsData(ctx)).anonymousMessages!.length, 1);
});


test("deleting students from studentRoster permanently removes their evaluations and prevents resurrection", async () => {
  const db = fakeDb();
  const ctx = { supabase: db, teacherId: TEACHER, mode: "owner" } as unknown as TeacherContext;

  let data = await getLessonsData(ctx);
  data.studentRoster = [
    { id: "s1", studentName: "تلميذ 1", className: "2م3", groupName: "فوج 1" },
    { id: "s2", studentName: "تلميذ 2", className: "2م3", groupName: "فوج 2" },
  ];
  await saveLessonsData(ctx, data);

  let check = await getLessonsData(ctx);
  assert.equal(check.studentRoster!.length, 2);
  assert.equal(check.evaluations!.length, 2);

  // حذف تلميذ 1 من القائمة
  check.studentRoster = check.studentRoster!.filter((s) => s.studentName !== "تلميذ 1");
  await saveLessonsData(ctx, check);

  const afterOne = await getLessonsData(ctx);
  assert.equal(afterOne.studentRoster!.length, 1);
  assert.equal(afterOne.studentRoster![0].studentName, "تلميذ 2");
  assert.equal(afterOne.evaluations!.length, 1);
  assert.equal(afterOne.evaluations![0].studentName, "تلميذ 2");

  // حذف كافة التلاميذ (تفريغ الفوج مثل حذف 81 تلميذ)
  afterOne.studentRoster = [];
  await saveLessonsData(ctx, afterOne);

  const afterAll = await getLessonsData(ctx);
  assert.equal(afterAll.studentRoster!.length, 0);
  assert.equal(afterAll.evaluations!.length, 0);
});
