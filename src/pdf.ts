// CR80 artwork at 300 dpi. The HiTi PPD uses a portrait 154.09 × 243.37 pt sheet.
export const CARD = {
  width: 1011,
  height: 638,
  widthMm: 85.6,
  heightMm: 53.98,
};
export type CardImage = { bytes: Uint8Array; width: number; height: number };

export function jpegDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
    throw new Error("A JPEG card image is required.");
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error("Invalid JPEG image.");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++]!;
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8 || bytes[offset + 2] !== 8 || bytes[offset + 7] !== 3)
        throw new Error("An 8-bit RGB JPEG is required.");
      return {
        height: (bytes[offset + 3]! << 8) | bytes[offset + 4]!,
        width: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
      };
    }
    offset += length;
  }
  throw new Error("Cannot read this JPEG image.");
}

// Rasterized artwork keeps Persian shaping, fonts, logos and previews identical in the PDF.
export function makePdf(images: CardImage[], forHiTi = false): Uint8Array {
  if (!images.length || images.length > 2)
    throw new Error("Choose one or two card sides.");
  const encode = (text: string) => new TextEncoder().encode(text);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const offsets = [0];
  const append = (data: string | Uint8Array) => {
    const bytes = typeof data === "string" ? encode(data) : data;
    chunks.push(bytes);
    size += bytes.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = size;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };
  append("%PDF-1.4\n%CardStudio\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`,
  );
  images.forEach((img, index) => {
    const landscape = img.width > img.height;
    const w = forHiTi
      ? 154.09
      : ((landscape ? CARD.widthMm : CARD.heightMm) * 72) / 25.4;
    const h = forHiTi
      ? 243.37
      : ((landscape ? CARD.heightMm : CARD.widthMm) * 72) / 25.4;
    const id = 3 + index * 3;
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(5)} ${h.toFixed(5)}] /Resources << /XObject << /Card ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`,
    );
    offsets[id + 1] = size;
    append(
      `${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`,
    );
    append(img.bytes);
    append("\nendstream\nendobj\n");
    const stream =
      forHiTi && landscape
        ? `q 0 ${h} -${w} 0 ${w} 0 cm /Card Do Q\n`
        : `q ${w} 0 0 ${h} 0 0 cm /Card Do Q\n`;
    object(
      id + 2,
      `<< /Length ${encode(stream).length} >>\nstream\n${stream}endstream`,
    );
  });
  const xref = size;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets
    .slice(1)
    .forEach((offset) =>
      append(`${String(offset).padStart(10, "0")} 00000 n \n`),
    );
  append(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );
  const result = new Uint8Array(size);
  let cursor = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, cursor);
    cursor += chunk.length;
  });
  return result;
}
