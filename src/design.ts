import { CARD } from "./pdf";
import { madarDesign } from "./madar";
import { universityDesign } from "./university";

export type Side = "front" | "back";
export type Template =
  "membership" | "business" | "minimal" | "custom" | "madar" | "university";
export type LayoutElement = {
  id: string;
  side: Side;
  kind: "text" | "image" | "rect";
  text: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  font: "serif" | "sans" | "mono" | "persian";
  bold: boolean;
  align: "left" | "center" | "right";
  rotation: number;
  private?: boolean;
  imageFit?: "stretch" | "cover";
  imageZoom?: number;
  imageOffsetX?: number;
  imageOffsetY?: number;
  singleLine?: boolean;
};
export type Design = {
  version: 1;
  template: Template;
  background: "none" | "university";
  name: string;
  brand: string;
  subtitle: string;
  tagline: string;
  number: string;
  website: string;
  contact: string;
  note: string;
  accent: string;
  paper: string;
  font: "serif" | "sans" | "mono";
  logo: string;
  frontArtwork: string;
  backArtwork: string;
  orientation: "landscape" | "portrait";
  monochrome: boolean;
  elements: LayoutElement[];
};
export const DEFAULT_DESIGN: Design = {
  version: 1,
  template: "membership",
  background: "none",
  brand: "ATELIER",
  name: "Alex Morgan",
  subtitle: "FOUNDING MEMBER",
  tagline: "A little belonging.\nA world of possibilities.",
  number: "AT — 000128",
  website: "atelier.club",
  contact: "hello@atelier.club\n+98 912 123 4567\nTehran, Iran",
  note: "Made for good company.\nThis card is personal. Please keep it with you.",
  accent: "#304c3d",
  paper: "#e9eddf",
  font: "serif",
  logo: "",
  frontArtwork: "",
  backArtwork: "",
  orientation: "landscape",
  monochrome: false,
  elements: [],
};
export function cardDimensions(orientation: Design["orientation"]) {
  return orientation === "portrait"
    ? {
        width: CARD.height,
        height: CARD.width,
        widthMm: CARD.heightMm,
        heightMm: CARD.widthMm,
      }
    : CARD;
}
export function createElement(
  side: Side,
  patch: Partial<LayoutElement> = {},
): LayoutElement {
  return {
    id: crypto.randomUUID(),
    side,
    kind: "text",
    text: "Your text",
    src: "",
    x: 6,
    y: 10,
    width: 40,
    height: 10,
    fontSize: 14,
    color: "#000000",
    font: "sans",
    bold: false,
    align: "left",
    rotation: 0,
    ...patch,
  };
}
export function customDesign(
  current: Design,
  orientation = current.orientation,
  blank = false,
): Design {
  const portrait = orientation === "portrait";
  const elements =
    (current.template === "custom" || current.template === "madar" || current.template === "university") && !blank
      ? current.elements
      : blank
        ? []
        : [
            createElement("front", {
              text: current.name,
              y: portrait ? 26 : 22,
              width: portrait ? 42 : 73,
              fontSize: 18,
              height: 16,
            }),
            createElement("front", {
              text: current.subtitle,
              y: portrait ? 44 : 36,
              width: portrait ? 42 : 73,
              fontSize: 8,
            }),
            createElement("front", {
              text: current.number,
              y: portrait ? 66 : 43,
              width: portrait ? 42 : 73,
              fontSize: 10,
            }),
            createElement("back", {
              text: current.contact,
              y: 20,
              width: portrait ? 42 : 73,
              height: 24,
              fontSize: 10,
            }),
          ];
  const dims = cardDimensions(orientation);
  return {
    ...current,
    template: "custom",
    orientation,
    paper: "#ffffff",
    accent: "#000000",
    frontArtwork: "",
    backArtwork: "",
    elements: elements.map((e) => ({
      ...e,
      x: Math.min(e.x, dims.widthMm - 5),
      y: Math.min(e.y, dims.heightMm - 5),
      width: Math.min(e.width, dims.widthMm),
    })),
  };
}
const stringFields = [
  "name",
  "brand",
  "subtitle",
  "tagline",
  "number",
  "website",
  "contact",
  "note",
] as const;
export function validateDesign(value: unknown): Design {
  if (!value || typeof value !== "object")
    throw new Error("Choose a Card Studio design file.");
  const d = value as Record<string, unknown>;
  if (
    d.version !== 1 ||
    !["membership", "business", "minimal", "custom", "madar", "university"].includes(
      String(d.template),
    )
  )
    throw new Error("This design format is not supported.");
  for (const key of stringFields)
    if (typeof d[key] !== "string" || (d[key] as string).length > 600)
      throw new Error("Design text is invalid or too long.");
  for (const key of ["accent", "paper"])
    if (typeof d[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(d[key] as string))
      throw new Error("Invalid design color.");
  if (!["serif", "sans", "mono"].includes(String(d.font)))
    throw new Error("Invalid font selection.");
  for (const key of ["logo", "frontArtwork", "backArtwork"])
    if (
      typeof d[key] !== "string" ||
      ((d[key] as string) !== "" &&
        (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(
          d[key] as string,
        ) ||
          (d[key] as string).length > 2_500_000))
    )
      throw new Error("Invalid design image.");
  if (d.background !== undefined && !["none", "university"].includes(String(d.background)))
    throw new Error("Invalid built-in card background.");
  const orientation = d.orientation ?? "landscape";
  if (orientation !== "landscape" && orientation !== "portrait")
    throw new Error("Invalid card orientation.");
  if (d.monochrome !== undefined && typeof d.monochrome !== "boolean")
    throw new Error("Invalid print color mode.");
  const elements = d.elements ?? [];
  if (!Array.isArray(elements) || elements.length > 80)
    throw new Error("A design can contain up to 80 elements.");
  const ids = new Set<string>();
  for (const e of elements) {
    if (
      !e ||
      typeof e !== "object" ||
      typeof e.id !== "string" ||
      e.id.length > 100 ||
      ids.has(e.id) ||
      !["front", "back"].includes(e.side) ||
      !["text", "image", "rect"].includes(e.kind)
    )
      throw new Error("Invalid layout element.");
    if (e.private !== undefined && typeof e.private !== "boolean")
      throw new Error("Invalid element privacy flag.");
    if (e.imageFit !== undefined && !["stretch", "cover"].includes(e.imageFit))
      throw new Error("Invalid image fitting mode.");
    if (e.singleLine !== undefined && typeof e.singleLine !== "boolean")
      throw new Error("Invalid text fitting mode.");
    for (const [key, min, max] of [["imageZoom", 1, 3], ["imageOffsetX", -1, 1], ["imageOffsetY", -1, 1]] as const) {
      if (e[key] !== undefined && (typeof e[key] !== "number" || !Number.isFinite(e[key]) || e[key] < min || e[key] > max))
        throw new Error("Invalid image crop settings.");
    }
    ids.add(e.id);
    for (const key of ["x", "y", "width", "height", "fontSize", "rotation"])
      if (
        typeof e[key] !== "number" ||
        !Number.isFinite(e[key]) ||
        Math.abs(e[key]) > 1000
      )
        throw new Error("Invalid element position or size.");
    if (
      e.width <= 0 ||
      e.height <= 0 ||
      e.fontSize <= 0 ||
      typeof e.text !== "string" ||
      e.text.length > 2000 ||
      !/^#[0-9a-f]{6}$/i.test(e.color) ||
      !["serif", "sans", "mono", "persian"].includes(e.font) ||
      !["left", "right", "center"].includes(e.align) ||
      typeof e.bold !== "boolean"
    )
      throw new Error("Invalid element style.");
    if (
      typeof e.src !== "string" ||
      (e.src !== "" &&
        (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(e.src) ||
          e.src.length > 2_500_000))
    )
      throw new Error("Invalid element image.");
  }
  // Keep older saved designs compatible as the editor gains controls.
  return {
    ...Object.fromEntries(
      Object.keys(DEFAULT_DESIGN).map((key) => [
        key,
        d[key] ?? DEFAULT_DESIGN[key as keyof Design],
      ]),
    ),
    orientation,
    elements,
    monochrome: d.monochrome ?? false,
  } as Design;
}
export function templateDesign(template: Template, current: Design): Design {
  if (template === "madar") return madarDesign(current);
  if (template === "university") return universityDesign(current);
  if (template === "custom")
    return { ...customDesign(current, current.orientation, true), background: "none" };
  return {
    ...current,
    template,
    background: "none",
    orientation: "landscape",
    frontArtwork: "",
    backArtwork: "",
    paper:
      template === "business"
        ? "#f6f1e8"
        : template === "minimal"
          ? "#ffffff"
          : "#e9eddf",
    accent:
      template === "business"
        ? "#494558"
        : template === "minimal"
          ? "#232b30"
          : "#304c3d",
    subtitle:
      template === "business"
        ? "DESIGNER & CREATIVE DIRECTOR"
        : "FOUNDING MEMBER",
  };
}
const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("This image could not be opened."));
      image.src = src;
    });
    if (imageCache.size > 12) imageCache.clear();
    imageCache.set(src, promise);
  }
  return promise;
}

export async function renderCard(
  d: Design,
  side: Side,
): Promise<HTMLCanvasElement> {
  const canvas =
    d.template === "custom" || d.template === "madar" || d.template === "university"
      ? await renderCustom(d, side)
      : await renderTemplate(d, side);
  if (d.monochrome) {
    const ctx = canvas.getContext("2d")!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value =
        pixels.data[i]! * 0.2126 +
          pixels.data[i + 1]! * 0.7152 +
          pixels.data[i + 2]! * 0.0722 <
        180
          ? 0
          : 255;
      pixels.data[i] = value;
      pixels.data[i + 1] = value;
      pixels.data[i + 2] = value;
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return canvas;
}

async function renderCustom(d: Design, side: Side): Promise<HTMLCanvasElement> {
  const dims = cardDimensions(d.orientation);
  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d")!;
  const scale = dims.width / dims.widthMm;
  ctx.fillStyle = d.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (d.background === "university") {
    const background = await loadImage(`/reference/university-${side}.png`);
    ctx.save();
    if (d.orientation === "portrait") {
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(background, 0, 0, canvas.height, canvas.width);
    } else ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  const art = side === "front" ? d.frontArtwork : d.backArtwork;
  if (art) {
    const img = await loadImage(art);
    const s = Math.max(canvas.width / img.width, canvas.height / img.height);
    ctx.drawImage(
      img,
      (canvas.width - img.width * s) / 2,
      (canvas.height - img.height * s) / 2,
      img.width * s,
      img.height * s,
    );
  }
  for (const e of d.elements.filter((e) => e.side === side)) {
    ctx.save();
    ctx.translate((e.x + e.width / 2) * scale, (e.y + e.height / 2) * scale);
    ctx.rotate((e.rotation * Math.PI) / 180);
    ctx.translate((-e.width * scale) / 2, (-e.height * scale) / 2);
    ctx.beginPath();
    ctx.rect(0, 0, e.width * scale, e.height * scale);
    ctx.clip();
    ctx.fillStyle = e.color;
    if (e.kind === "image" && e.src) {
      const image = await loadImage(e.src);
      if (e.imageFit === "cover") {
        const frameWidth = e.width * scale;
        const frameHeight = e.height * scale;
        const factor = Math.max(frameWidth / image.width, frameHeight / image.height) * (e.imageZoom ?? 1);
        const width = image.width * factor;
        const height = image.height * factor;
        ctx.drawImage(image, (frameWidth - width) / 2 + (e.imageOffsetX ?? 0) * (width - frameWidth) / 2,
          (frameHeight - height) / 2 + (e.imageOffsetY ?? 0) * (height - frameHeight) / 2, width, height);
      } else ctx.drawImage(image, 0, 0, e.width * scale, e.height * scale);
    } else if (e.kind === "rect")
      ctx.fillRect(0, 0, e.width * scale, e.height * scale);
    else {
      const font =
        e.font === "serif"
          ? "Georgia, serif"
          : e.font === "mono"
            ? '"Courier New", monospace'
            : e.font === "persian"
              ? '"Geeza Pro", Tahoma, serif'
              : "Arial, sans-serif";
      const size = ((e.fontSize * 25.4) / 72) * scale;
      ctx.font = `${e.bold ? "700" : "400"} ${size}px ${font}`;
      ctx.textBaseline = "top";
      const rtl = /[\u0590-\u08ff]/.test(e.text);
      ctx.direction = rtl ? "rtl" : "ltr";
      ctx.textAlign = e.align === "left" && rtl ? "right" : e.align;
      const x =
        ctx.textAlign === "right"
          ? e.width * scale
          : ctx.textAlign === "center"
            ? (e.width * scale) / 2
            : 0;
      const lines: string[] = [];
      if (e.singleLine) {
        ctx.fillText(e.text.replace(/[\r\n]/g, " "), x, 0, e.width * scale);
        ctx.restore();
        continue;
      }
      for (const paragraph of e.text.split("\n")) {
        let line = "";
        for (const word of paragraph.split(" ")) {
          const next = line ? `${line} ${word}` : word;
          if (line && ctx.measureText(next).width > e.width * scale) {
            lines.push(line);
            line = word;
          } else line = next;
        }
        lines.push(line);
      }
      lines.forEach((line, index) =>
        ctx.fillText(line, x, index * size * 1.3, e.width * scale),
      );
    }
    ctx.restore();
  }
  return canvas;
}

async function renderTemplate(
  d: Design,
  side: Side,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = d.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const artwork = side === "front" ? d.frontArtwork : d.backArtwork;
  if (artwork) {
    const image = await loadImage(artwork);
    const scale = Math.max(
      canvas.width / image.width,
      canvas.height / image.height,
    );
    ctx.drawImage(
      image,
      (canvas.width - image.width * scale) / 2,
      (canvas.height - image.height * scale) / 2,
      image.width * scale,
      image.height * scale,
    );
    return canvas;
  }
  const font =
    d.font === "serif"
      ? 'Georgia, "Times New Roman", serif'
      : d.font === "mono"
        ? '"Courier New", monospace'
        : "Arial, sans-serif";
  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    width = 870,
    weight = "400",
    face = font,
    color = d.accent,
  ) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${face}`;
    while (ctx.measureText(value).width > width && size > 12)
      ctx.font = `${weight} ${--size}px ${face}`;
    const rtl = /[\u0590-\u08ff]/.test(value);
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillText(value, rtl ? x + width : x, y);
  }
  function lines(
    value: string,
    x: number,
    y: number,
    size: number,
    step: number,
    width = 870,
  ) {
    value
      .split("\n")
      .slice(0, 5)
      .forEach((line, i) => text(line, x, y + i * step, size, width));
  }
  function rule(y: number) {
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = d.accent;
    ctx.fillRect(64, y, 883, 1.2);
    ctx.globalAlpha = 1;
  }
  if (side === "back") {
    ctx.fillStyle = d.accent;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const inverse = { ...d, accent: d.paper, paper: d.accent };
    return renderBack(canvas, inverse, d, font);
  }
  if (d.template === "membership") {
    ctx.save();
    ctx.strokeStyle = d.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.13;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(930, 205, 185 + i * 31, 250 + i * 31, 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (d.logo) {
      const logo = await loadImage(d.logo);
      const scale = Math.min(85 / logo.width, 85 / logo.height);
      ctx.drawImage(logo, 64, 50, logo.width * scale, logo.height * scale);
    } else
      text(
        `${Array.from(d.brand.trim())[0]?.toLowerCase() || "a"}.`,
        64,
        118,
        80,
        100,
        "400",
        "Georgia, serif",
      );
    text(d.brand, 184, 85, 24, 580, "600", "Arial, sans-serif");
    text("MEMBERS CLUB", 184, 115, 15, 580, "400", "Arial, sans-serif");
    lines(d.tagline, 64, 283, 58, 72, 805);
    rule(448);
    text(d.name, 64, 511, 34, 600);
    text(d.subtitle, 64, 549, 15, 600, "500", "Arial, sans-serif");
    text(d.number, 690, 547, 18, 257, "400", "Arial, sans-serif");
    text(d.website, 64, 599, 15, 650, "400", "Arial, sans-serif");
    text("EST. 2026", 807, 599, 14, 140, "400", "Arial, sans-serif");
  } else if (d.template === "business") {
    ctx.fillStyle = d.accent;
    ctx.fillRect(0, 0, 19, CARD.height);
    text(d.brand, 72, 95, 22, 770, "600", "Arial, sans-serif");
    if (d.logo) {
      const logo = await loadImage(d.logo);
      const s = Math.min(80 / logo.width, 80 / logo.height);
      ctx.drawImage(logo, 865, 55, logo.width * s, logo.height * s);
    }
    text(d.name, 72, 285, 76, 870);
    text(d.subtitle, 76, 335, 20, 860, "400", "Arial, sans-serif");
    rule(465);
    lines(d.contact, 76, 518, 19, 30, 600);
    text(d.website, 661, 579, 20, 286, "400", "Arial, sans-serif");
  } else {
    text(d.brand, 65, 95, 21, 700, "600", "Arial, sans-serif");
    if (d.logo) {
      const logo = await loadImage(d.logo);
      const s = Math.min(80 / logo.width, 80 / logo.height);
      ctx.drawImage(logo, 865, 55, logo.width * s, logo.height * s);
    }
    text(d.name, 65, 319, 69, 880);
    text(d.subtitle, 68, 366, 18, 870, "400", "Arial, sans-serif");
    text(d.website, 65, 570, 22, 600);
    text(d.number, 690, 570, 17, 257, "400", "Arial, sans-serif");
  }
  return canvas;
}

async function renderBack(
  canvas: HTMLCanvasElement,
  inverse: Design,
  original: Design,
  font: string,
) {
  const ctx = canvas.getContext("2d")!;
  const write = (
    value: string,
    x: number,
    y: number,
    size: number,
    width = 870,
    face = font,
  ) => {
    ctx.fillStyle = inverse.accent;
    ctx.font = `400 ${size}px ${face}`;
    while (ctx.measureText(value).width > width && size > 12)
      ctx.font = `400 ${--size}px ${face}`;
    const rtl = /[\u0590-\u08ff]/.test(value);
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillText(value, rtl ? x + width : x, y);
  };
  ctx.strokeStyle = inverse.accent;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(940, 75, 160 + i * 45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  write(original.brand, 65, 94, 25, 760, "Arial, sans-serif");
  if (original.logo) {
    const image = await loadImage(original.logo);
    const s = Math.min(70 / image.width, 70 / image.height);
    ctx.drawImage(image, 870, 50, image.width * s, image.height * s);
  }
  write(
    original.template === "membership"
      ? "Good things happen together."
      : original.name,
    65,
    245,
    49,
  );
  original.contact
    .split("\n")
    .slice(0, 4)
    .forEach((line, i) =>
      write(line, 65, 311 + i * 34, 22, 850, "Arial, sans-serif"),
    );
  ctx.fillStyle = inverse.accent;
  ctx.globalAlpha = 0.24;
  ctx.fillRect(65, 478, 881, 1);
  ctx.globalAlpha = 1;
  original.note
    .split("\n")
    .slice(0, 3)
    .forEach((line, i) =>
      write(line, 65, 521 + i * 26, 16, 850, "Arial, sans-serif"),
    );
  write(original.website, 65, 596, 18, 600, "Arial, sans-serif");
  write(original.number, 690, 596, 16, 257, "Arial, sans-serif");
  return canvas;
}
