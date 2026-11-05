import type { Design, LayoutElement } from "./design";

export const UNIVERSITY_FIELDS = [
  { key: "number", label: "شمارهٔ دانشجویی", placeholder: "شمارهٔ دانشجویی", y: 22.8, limit: 24 },
  { key: "holder", label: "نام و نام خانوادگی", placeholder: "نام و نام خانوادگی", y: 27.9, limit: 80 },
  { key: "father", label: "نام پدر", placeholder: "نام پدر", y: 32.8, limit: 40 },
  { key: "faculty", label: "دانشکده", placeholder: "مهندسی برق و کامپیوتر", y: 38.4, limit: 60 },
  { key: "degree", label: "مقطع", placeholder: "کارشناسی", y: 44, limit: 40 },
  { key: "expiry", label: "تاریخ اعتبار", placeholder: "۱۴۰۶/۰۶/۳۱", y: 49, limit: 24 },
] as const;
export type UniversityField = typeof UNIVERSITY_FIELDS[number]["key"];
export const UNIVERSITY_PHOTO_ID = "university-photo";
const element = (id: string, patch: Partial<LayoutElement>): LayoutElement => ({
  id, side: "front", kind: "text", text: "", src: "", x: 29.4, y: 22.8,
  width: 34, height: 4.8, fontSize: 7.2, font: "persian", color: "#171416",
  align: "center", bold: true, rotation: 0, ...patch,
});
export function universityDesign(current: Design): Design {
  return {
    ...current, template: "university", background: "university", orientation: "landscape",
    monochrome: false, paper: "#fffef8", accent: "#a96f61",
    brand: "دانشگاه صنعتی جندی‌شاپور دزفول", name: "", number: "", subtitle: "",
    tagline: "", contact: "", website: "", note: "", logo: "", frontArtwork: "", backArtwork: "",
    elements: [
      element(UNIVERSITY_PHOTO_ID, { kind: "image", private: true, x: 5.99, y: 17.6,
        width: 23.38, height: 30.8, imageFit: "cover", imageZoom: 1, imageOffsetX: 0, imageOffsetY: 0 }),
      ...UNIVERSITY_FIELDS.map((field) => element(`university-${field.key}`, {
        y: field.y, private: true, singleLine: true,
      })),
      element("university-address", { side: "back", private: false, x: 10.3, y: 25.8, width: 29.5,
        text: "دزفول ـ صندوق پستی ۳۳۴", fontSize: 7.1, align: "right" }),
      element("university-fax-label", { side: "back", x: 30.2, y: 30.7, width: 9.4, text: "نمابر", align: "right" }),
      element("university-fax", { side: "back", x: 10.7, y: 30.7, width: 18.2, text: "۰۶۱ ۴۲۴۱۸۵۵۵", fontSize: 7.1 }),
      element("university-phone-label", { side: "back", x: 30.2, y: 35.5, width: 9.4, text: "تلفن", align: "right" }),
      element("university-phone", { side: "back", x: 10.7, y: 35.5, width: 18.2, text: "۰۶۱ ۴۲۴۱۸۵۰۰", fontSize: 7.1 }),
      element("university-web-label", { side: "back", x: 28.3, y: 40.1, width: 11.3, text: "وب سایت", align: "right" }),
      element("university-web", { side: "back", x: 10.8, y: 40.4, width: 15.6, text: "www.jsu.ac.ir", font: "sans", bold: false, fontSize: 6.8 }),
    ],
  };
}
export function universityFieldValue(design: Design, key: UniversityField): string {
  return design.elements.find((item) => item.id === `university-${key}`)?.text ?? "";
}
export function updateUniversityField(design: Design, key: UniversityField, value: string): LayoutElement[] {
  const id = `university-${key}`;
  const existing = design.elements.find((item) => item.id === id) ?? universityDesign(design).elements.find((item) => item.id === id)!;
  const definition = UNIVERSITY_FIELDS.find((item) => item.key === key)!;
  const text = value.replace(/[\r\n]/g, " ").slice(0, definition.limit);
  return [...design.elements.filter((item) => item.id !== id), { ...existing, text, private: true }];
}
export function updateUniversityPhoto(design: Design, src: string): LayoutElement[] {
  const existing = design.elements.find((item) => item.id === UNIVERSITY_PHOTO_ID) ?? universityDesign(design).elements[0]!;
  return [...design.elements.filter((item) => item.id !== UNIVERSITY_PHOTO_ID),
    { ...existing, src, private: true, imageFit: "cover" as const, imageZoom: 1, imageOffsetX: 0, imageOffsetY: 0 }];
}
