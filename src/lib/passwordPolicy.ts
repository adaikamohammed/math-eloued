// سياسة أمان كلمات المرور لجميع الحسابات (أساتذة ومفتشين)
// مطابقة لمعايير الأمان السيبراني لمنع استهداف الحسابات بالتخمين

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePasswordStrength(pwd: string): PasswordValidationResult {
  if (!pwd || pwd.length < 8) {
    return {
      valid: false,
      error: "كلمة المرور يجب أن تتكون من 8 خانات على الأقل لضمان حماية حسابك وبيانات تلاميذك.",
    };
  }

  // التحقق من وجود أحرف (لاتينية أو عربية)
  const hasLetter = /[a-zA-Z\u0621-\u064A]/.test(pwd);
  // التحقق من وجود أرقام
  const hasNumber = /\d/.test(pwd);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: "يجب أن تحتوي كلمة المرور على أحرف وأرقام معاً (مثال: Math2026 أو أستاذ123) لضمان قوتها.",
    };
  }

  // منع كلمات المرور التافهة والشهيرة
  const weakPasswords = [
    "12345678",
    "123456789",
    "password",
    "password123",
    "azerty123",
    "qwerty123",
    "admin123",
    "00000000",
  ];
  if (weakPasswords.includes(pwd.toLowerCase())) {
    return {
      valid: false,
      error: "كلمة المرور هذه شائعة جداً وسهلة التخمين، يرجى اختيار كلمة مرور أكثر تعقيداً.",
    };
  }

  return { valid: true };
}
