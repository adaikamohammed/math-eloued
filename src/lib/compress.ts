"use client";

import imageCompression from "browser-image-compression";

// ضغط صور السبورة والوثائق في متصفح الأستاذ قبل الرفع
// أقصى بُعد 1600px يحافظ على وضوح الطباشير والمعادلات، وحجم ~150-350KB لكل صورة
export const BOARD_IMAGE_OPTIONS = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 0.4,
  useWebWorker: true,
  initialQuality: 0.82,
  fileType: "image/jpeg",
} as const;

export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  const name = (file.name || "").toLowerCase();
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp|jfif)$/i.test(name);
}

// ضغط سريع واحتياطي عبر Canvas يضمن النجاح 100% على كافة الهواتف (آيفون، أندرويد)
async function compressViaCanvas(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (typeof window === "undefined") return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([blob], newName, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function compressIfImage(file: File): Promise<File> {
  if (!isImageFile(file) || file.type === "image/gif") return file;
  try {
    const compressed = await imageCompression(file, BOARD_IMAGE_OPTIONS);
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([compressed], name, { type: "image/jpeg" });
  } catch (err) {
    // في حال تعذر webworker على بعض متصفحات الهواتف، نلجأ فوراً لضغط Canvas
    try {
      return await compressViaCanvas(file);
    } catch {
      return file;
    }
  }
}

// الأنواع المسموحة للرفع
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 ميغابايت قبل الضغط

export function validateUpload(file: File): string | null {
  const name = (file.name || "").toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isImg = isImageFile(file);

  if (!isImg && !isPdf) {
    return "نوع الملف غير مدعوم (يرجى اختيار صورة أو مستند PDF)";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "حجم الملف كبير جداً (أكثر من 25 ميغابايت)";
  }
  return null;
}

export function safeStorageName(name: string) {
  const ext = (name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40) || "file";
  return `${Date.now()}-${base}${ext || ".jpg"}`;
}
