import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByChild, teacherFeedItems } from "./parentFeed";

const data = {
  announcements: [
    { id: "a1", title: "غياب", content: "x", category: "absence", date: "", createdAt: "2026-10-03" },
    { id: "a2", title: "مخفي", content: "x", category: "general", date: "", active: false, createdAt: "2026-10-04" },
  ],
  summons: [
    { id: "s1", studentName: "أحمد  بن علي", className: "1م3", createdAt: "2026-10-05" },
    { id: "s2", studentName: "سارة", className: "1م3", createdAt: "2026-10-01" },
  ],
  lessons: [{ id: "l 1", level: 1, number: 1, title: "الأعداد", images: [], createdAt: "2026-10-02" }],
  honors: [{ id: "h1", studentName: "أحمد بن علي", className: "1م3", createdAt: "" }],
};

test("teacherFeedItems: skips hidden and undated items, flags the child, builds links", () => {
  const items = teacherFeedItems({ id: "T1", name: "أ. خالد", childName: "أحمد بن علي" }, data);
  assert.deepEqual(items.map((i) => i.key).sort(), ["a-T1-a1", "l-T1-l 1", "s-T1-s1"]);
  assert.equal(items.find((i) => i.key === "a-T1-a1")!.urgent, true);
  assert.equal(items.find((i) => i.key === "s-T1-s1")!.mentionsChild, true);
  assert.equal(items.find((i) => i.kind === "lesson")!.href, "/lesson/l%201?teacher=T1");
  assert.deepEqual(teacherFeedItems({ id: "T1", name: "x" }, null), []);
});

test("groupByChild: merges teachers of the same child, newest first, unnamed last", () => {
  const t1 = { id: "T1", name: "أ", childName: "أحمد" };
  const t2 = { id: "T2", name: "ب" };
  const t3 = { id: "T3", name: "ج", childName: " أحمد " };
  const groups = groupByChild([
    { teacher: t2, items: teacherFeedItems(t2, data) },
    { teacher: t1, items: teacherFeedItems(t1, data) },
    { teacher: t3, items: teacherFeedItems(t3, { lessons: [{ ...data.lessons[0], id: "l9", createdAt: "2026-10-09" }] }) },
  ]);
  assert.deepEqual(groups.map((g) => g.childName), ["أحمد", "أبنائي"]);
  assert.equal(groups[0].teachers.length, 2);
  assert.equal(groups[0].items[0].key, "l-T3-l9");
  const dates = groups[0].items.map((i) => i.createdAt);
  assert.deepEqual(dates, [...dates].sort().reverse());
});
