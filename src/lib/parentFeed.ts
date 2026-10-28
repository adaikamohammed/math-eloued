import type { Announcement, HonorStudent, Lesson, ParentSummons } from "./types";

export type FeedKind = "announcement" | "summons" | "lesson" | "honor";

export interface FeedTeacher {
  id: string;
  name: string;
  childName?: string;
}

export interface FeedItem {
  key: string;
  kind: FeedKind;
  teacherId: string;
  teacherName: string;
  title: string;
  body?: string;
  createdAt: string;
  href: string;
  urgent?: boolean;
  // التلميذ المذكور يطابق اسم الابن المسجل في المحفظة
  mentionsChild?: boolean;
}

export interface ChildGroup {
  childName: string;
  teachers: FeedTeacher[];
  items: FeedItem[];
}

const UNNAMED = "أبنائي";
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function nameMatches(studentName: string, childName?: string) {
  if (!childName) return false;
  const a = norm(studentName);
  const b = norm(childName);
  return b.length >= 2 && (a.includes(b) || b.includes(a));
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// يحوّل البيانات العامة لأستاذ واحد إلى عناصر خلاصة موحدة
export function teacherFeedItems(teacher: FeedTeacher, data: Record<string, unknown> | null): FeedItem[] {
  if (!data) return [];
  const t = encodeURIComponent(teacher.id);
  const base = { teacherId: teacher.id, teacherName: teacher.name };
  const items: FeedItem[] = [];

  for (const a of arr<Announcement>(data.announcements)) {
    if (a.active === false) continue;
    items.push({
      ...base,
      key: `a-${teacher.id}-${a.id}`,
      kind: "announcement",
      title: a.title,
      body: a.content,
      createdAt: a.createdAt,
      href: `/announcement?teacher=${t}`,
      urgent: a.category === "urgent" || a.category === "absence",
    });
  }
  for (const s of arr<ParentSummons>(data.summons)) {
    // حماية الخصوصية ومنع الوصم: لا يُعرض التوجيه في خلاصة المحفظة إلا إذا تطابق حصراً مع اسم الابن المسجل
    if (!nameMatches(s.studentName, teacher.childName)) continue;
    items.push({
      ...base,
      key: `s-${teacher.id}-${s.id}`,
      kind: "summons",
      title: `توجيه خاص بولي التلميذ(ة) ${s.studentName} — ${s.className}`,
      body: s.notes,
      createdAt: s.createdAt,
      href: `/parents?teacher=${t}`,
      urgent: s.isUrgent,
      mentionsChild: true,
    });
  }
  for (const l of arr<Lesson>(data.lessons)) {
    items.push({
      ...base,
      key: `l-${teacher.id}-${l.id}`,
      kind: "lesson",
      title: l.title,
      body: l.homeworkNotes ? `الواجب: ${l.homeworkNotes}` : l.notes,
      createdAt: l.createdAt,
      href: `/lesson/${encodeURIComponent(l.id)}?teacher=${t}`,
    });
  }
  for (const h of arr<HonorStudent>(data.honors)) {
    items.push({
      ...base,
      key: `h-${teacher.id}-${h.id}`,
      kind: "honor",
      title: `${h.studentName} — ${h.className}${h.badge ? ` ${h.badge}` : ""}`,
      body: h.notes,
      createdAt: h.createdAt,
      href: `/honor?teacher=${t}`,
      mentionsChild: nameMatches(h.studentName, teacher.childName),
    });
  }
  return items.filter((i) => i.createdAt);
}

// يجمع عناصر كل الأساتذة حسب اسم الابن، الأحدث أولاً
export function groupByChild(entries: { teacher: FeedTeacher; items: FeedItem[] }[]): ChildGroup[] {
  const groups = new Map<string, ChildGroup>();
  for (const { teacher, items } of entries) {
    const childName = norm(teacher.childName || "") || UNNAMED;
    const g = groups.get(childName) ?? { childName, teachers: [], items: [] };
    g.teachers.push(teacher);
    g.items.push(...items);
    groups.set(childName, g);
  }
  const out = [...groups.values()];
  for (const g of out) g.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // الأبناء المسمّون أولاً
  return out.sort((a, b) => Number(a.childName === UNNAMED) - Number(b.childName === UNNAMED));
}
