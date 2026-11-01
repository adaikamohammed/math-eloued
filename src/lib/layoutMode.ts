// full: الصفحة تتحكم في عرضها • wide: عمود الهاتف يتسع على الحاسوب • phone: عمود الهاتف دائماً
export type LayoutMode = "full" | "wide" | "phone";

const FULL_PREFIXES = ["/inspector", "/super-admin", "/login", "/register", "/t", "/forum"];
const WIDE_PREFIXES = ["/admin", "/year", "/lesson", "/messages", "/eval", "/honor"];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

export function layoutFor(pathname: string): LayoutMode {
  if (pathname === "/" || FULL_PREFIXES.some((p) => under(pathname, p))) return "full";
  if (WIDE_PREFIXES.some((p) => under(pathname, p))) return "wide";
  return "phone";
}
