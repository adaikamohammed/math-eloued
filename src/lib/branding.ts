/**
 * الهوية البصرية والتسمية الرسمية المعتمدة للمنصة
 * منصة جسور التعليمية (Jusoor Educational Platform)
 * توحيد الرؤية والربط المباشر بين الأستاذ، الولي، التلميذ، والإدارة
 */

export interface PlatformNameOption {
  id: string;
  name: string;
  tagline: string;
  description: string;
  targetAudience: string;
}

export const PLATFORM_NAME_OPTIONS: PlatformNameOption[] = [
  {
    id: "josoor",
    name: "منصة جسور التعليمية",
    tagline: "حيث يلتقي الأستاذ، الولي، والتلميذ",
    description: "اسم يعبر عن الجسور التربوية الصلبة التي تربط حجرة الصف بالمنزل وتجمع بين الأستاذ والولي والتلميذ والإدارة.",
    targetAudience: "الأسرة التربوية والتلاميذ وأولياء الأمور والإدارة",
  },
];

// الاسم المعتمد الافتراضي للمنصة
export const BRANDING = {
  name: "منصة جسور التعليمية",
  englishName: "Jusoor — Educational Platform",
  shortName: "منصة جسور",
  latinShortName: "Jusoor",
  subTitle: "المنصة الوطنية للتربية والتعليم والتسيير البيداغوجي",
  tagline: "حيث يلتقي الأستاذ، الولي، والتلميذ",
  jurisdiction: "الجمهورية الجزائرية الديمقراطية الشعبية",
  ministry: "وزارة التربية الوطنية",
  directorate: "قطاع التربية الوطنية والتعليم المتوسط",
  phase: "التعليم المتوسط",
  origin: "الجزائر",
  domain: "josoor-dz.vercel.app",
  dedication: "هذا العمل وقفٌ تعليمي وعلمٌ يُنتفع به، صدقة جارية عن روح الفقيد فارس، رحمه الله وأسكنه فسيح جناته",
};
