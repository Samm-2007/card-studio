import type { Design, LayoutElement } from "./design";

export type MadarField = "holder" | "number" | "expiry" | "cvv2";
export const MADAR_PERSONAL_IDS = [
  "madar-holder",
  "madar-number",
  "madar-expiry",
  "madar-cvv2",
];

export function latinDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (c) =>
    String(c.charCodeAt(0) - (c >= "۰" ? 0x6f0 : 0x660)),
  );
}
export function stackedNumber(text: string): string {
  return (
    latinDigits(text)
      .replace(/\s/g, "")
      .replace(/[0-9]/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[Number(c)]!)
      .match(/.{1,4}/g)
      ?.join("\n") ?? ""
  );
}

export function madarDesign(current: Design): Design {
  const entry = (id: string, patch: Partial<LayoutElement>): LayoutElement => ({
    id: `madar-${id}`,
    side: "back",
    kind: "text",
    text: "",
    src: "",
    x: 21,
    y: 5,
    width: 20,
    height: 10,
    fontSize: 14,
    color: "#000000",
    font: "persian",
    bold: false,
    align: "center",
    rotation: 0,
    private: !id.startsWith("label-"),
    ...patch,
  });
  return {
    ...current,
    template: "madar",
    background: "none",
    orientation: "portrait",
    monochrome: current.monochrome,
    brand: "Madar",
    name: "",
    subtitle: "",
    number: "",
    tagline: "",
    website: "",
    contact: "",
    note: "",
    paper: "#ffffff",
    accent: "#000000",
    logo: "",
    frontArtwork: "",
    backArtwork: "",
    elements: [
      entry("holder", {
        x: 20.4,
        y: 4.5,
        width: 21.5,
        height: 24,
        fontSize: 14.2,
      }),
      entry("number", {
        x: 21,
        y: 29.2,
        width: 18.5,
        height: 28,
        fontSize: 14,
      }),
      entry("label-exp", {
        x: 20.7,
        y: 60.8,
        width: 12.5,
        height: 6.2,
        font: "sans",
        fontSize: 13.4,
        text: "exp",
      }),
      entry("expiry", {
        x: 20.7,
        y: 66.5,
        width: 12.5,
        height: 5.4,
        font: "sans",
        fontSize: 10.4,
      }),
      entry("label-cvv2", {
        x: 38,
        y: 61.5,
        width: 12.2,
        height: 5.1,
        font: "sans",
        fontSize: 9.9,
        text: "cvv2",
      }),
      entry("cvv2", {
        x: 38,
        y: 66.5,
        width: 12.2,
        height: 5.4,
        font: "sans",
        fontSize: 10.4,
      }),
    ],
  };
}

export function madarFieldValue(design: Design, field: MadarField): string {
  const text =
    design.elements.find((e) => e.id === `madar-${field}`)?.text ?? "";
  return field === "number" ? latinDigits(text).replace(/\s/g, "") : text;
}
export function updateMadarField(
  design: Design,
  field: MadarField,
  value: string,
): Design["elements"] {
  const text =
    field === "number"
      ? stackedNumber(value)
      : field === "expiry" || field === "cvv2"
        ? latinDigits(value)
        : value;
  const id = `madar-${field}`;
  const original =
    design.elements.find((e) => e.id === id) ??
    madarDesign(design).elements.find((e) => e.id === id)!;
  return [...design.elements.filter((e) => e.id !== id), { ...original, text }];
}

// Layout autosave must not silently persist printed card data, including duplicated text layers.
export function designForAutosave(design: Design): Design {
  const isMadar = design.template === "madar";
  if (
    !isMadar &&
    !design.elements.some((e) => e.private || MADAR_PERSONAL_IDS.includes(e.id))
  )
    return design;
  return {
    ...design,
    name: "",
    number: "",
    contact: "",
    note: "",
    subtitle: "",
    tagline: "",
    website: "",
    elements: design.elements.map((e) =>
      e.private && e.kind === "image"
        ? { ...e, src: "" }
        : e.kind === "text" &&
      (e.private ||
        MADAR_PERSONAL_IDS.includes(e.id) ||
        (isMadar &&
          !(
            (e.id === "madar-label-exp" && e.text === "exp") ||
            (e.id === "madar-label-cvv2" && e.text === "cvv2")
          )))
        ? { ...e, text: "" }
        : e,
    ),
  };
}
