import { expect, test } from "bun:test";
import { DEFAULT_DESIGN, customDesign, templateDesign, validateDesign } from "../src/design";
import { designForAutosave } from "../src/madar";
import { UNIVERSITY_FIELDS, UNIVERSITY_PHOTO_ID, universityDesign, universityFieldValue, updateUniversityField, updateUniversityPhoto } from "../src/university";

const image = "data:image/png;base64,aGVsbG8=";

test("university preset has both sides, exact photo frame, and empty personal data", () => {
  const design = universityDesign(DEFAULT_DESIGN);
  expect(validateDesign(design).template).toBe("university");
  expect(design.orientation).toBe("landscape");
  expect(design.background).toBe("university");
  expect(design.elements.filter((element) => element.private)).toHaveLength(7);
  expect(UNIVERSITY_FIELDS.every(({ key }) => universityFieldValue(design, key) === "")).toBe(true);
  const photo = design.elements.find((element) => element.id === UNIVERSITY_PHOTO_ID)!;
  expect([photo.x, photo.y, photo.width, photo.height]).toEqual([5.99, 17.6, 23.38, 30.8]);
  expect(photo.src).toBe("");
  expect(photo.imageFit).toBe("cover");
  expect(design.elements.some((element) => element.side === "back" && element.text === "www.jsu.ac.ir")).toBe(true);
});

test("personal fields and photo can be replaced and survive editable design export/import", () => {
  let design = universityDesign(DEFAULT_DESIGN);
  design = { ...design, elements: updateUniversityField(design, "holder", "علی رضایی") };
  design = { ...design, elements: updateUniversityField(design, "number", "۰۰۱۲۳۴۵") };
  design = { ...design, elements: updateUniversityPhoto(design, image) };
  design = { ...design, elements: updateUniversityPhoto(design, image) };
  const restored = validateDesign(JSON.parse(JSON.stringify(design)));
  expect(universityFieldValue(restored, "holder")).toBe("علی رضایی");
  expect(universityFieldValue(restored, "number")).toBe("۰۰۱۲۳۴۵");
  expect(restored.elements.filter((element) => element.id === UNIVERSITY_PHOTO_ID)).toHaveLength(1);
  expect(restored.elements.find((element) => element.id === UNIVERSITY_PHOTO_ID)!.src).toBe(image);
});

test("autosave strips private photos and duplicates as well as all personal text", () => {
  let design = universityDesign(DEFAULT_DESIGN);
  for (const { key } of UNIVERSITY_FIELDS) design = { ...design, elements: updateUniversityField(design, key, "اطلاعات شخصی") };
  design = { ...design, elements: updateUniversityPhoto(design, image) };
  const photo = design.elements.find((element) => element.id === UNIVERSITY_PHOTO_ID)!;
  design.elements.push({ ...photo, id: "duplicate-photo" });
  for (const version of [design, customDesign(design)]) {
    const saved = designForAutosave(version);
    expect(saved.background).toBe("university");
    expect(saved.elements.filter((element) => element.private).every((element) => !element.text && !element.src)).toBe(true);
    expect(saved.elements.some((element) => element.text === "www.jsu.ac.ir")).toBe(true);
  }
  expect(design.elements.find((element) => element.id === UNIVERSITY_PHOTO_ID)!.src).toBe(image);
});

test("changing to another preset removes the university background", () => {
  const design = universityDesign(DEFAULT_DESIGN);
  for (const template of ["madar", "custom", "membership", "business", "minimal"] as const)
    expect(templateDesign(template, design).background).toBe("none");
});

test("photo crop settings and background keys are validated on design import", () => {
  const design = universityDesign(DEFAULT_DESIGN);
  for (const patch of [{ imageZoom: 0 }, { imageZoom: 4 }, { imageOffsetX: NaN }, { imageOffsetY: 2 }, { imageFit: "invalid" }, { singleLine: "yes" }])
    expect(() => validateDesign({ ...design, elements: [{ ...design.elements[0], ...patch }] })).toThrow();
  expect(() => validateDesign({ ...design, background: "https://example.com/image.png" })).toThrow();
  const legacy: Record<string, unknown> = { ...DEFAULT_DESIGN };
  delete legacy.background;
  expect(validateDesign(legacy).background).toBe("none");
});

test("deleted personal layers are restored by their named controls", () => {
  let design = universityDesign(DEFAULT_DESIGN);
  design.elements = design.elements.filter((element) => element.id !== "university-holder" && element.id !== UNIVERSITY_PHOTO_ID);
  design.elements = updateUniversityField(design, "holder", "نام جدید");
  design.elements = updateUniversityPhoto(design, image);
  expect(validateDesign(design).elements.find((element) => element.id === "university-holder")!.text).toBe("نام جدید");
  expect(design.elements.find((element) => element.id === UNIVERSITY_PHOTO_ID)!.private).toBe(true);
});
