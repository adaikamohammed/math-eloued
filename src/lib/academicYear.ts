/**
 * وحدة حساب وتحديد الموسم الدراسي تلقائياً وبذكاء لقطاع التربية الوطنية بالجزائر
 *
 * قاعدة الحساب الرسمية:
 * يبدأ الموسم الدراسي في الجزائر في شهر أوت / سبتمبر (الشهر 8 أو 9).
 * - إذا كان التاريخ الحالي بين أوت وديسمبر: الموسم الدراسي هو السنة الحالية / السنة القادمة (مثال: في نوفمبر 2026 -> 2026 / 2027 م).
 * - إذا كان التاريخ الحالي بين جانفي وجويلية: الموسم الدراسي هو السنة السابقة / السنة الحالية (مثال: في ماي 2027 -> 2026 / 2027 م).
 * - في سبتمبر 2027 ينتقل تلقائياً ودون أي تدخل يدوي إلى (2027 / 2028 م).
 */

export function getCurrentAcademicYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = جانفي ... 7 = أوت، 8 = سبتمبر
  if (month >= 7) {
    return `${year} / ${year + 1} م`;
  }
  return `${year - 1} / ${year} م`;
}

export function getCurrentAcademicYearShort(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 7) {
    return `${year} / ${year + 1}`;
  }
  return `${year - 1} / ${year}`;
}
