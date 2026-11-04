import { loadImage, type Design, type Side } from "./design";

// Display-only composition. Printing and all artwork exports continue to use renderCard directly.
export async function referencePreview(
  design: Design,
  side: Side,
  printCanvas: HTMLCanvasElement,
  visible: boolean,
): Promise<HTMLCanvasElement> {
  if (design.template !== "madar" || !visible) return printCanvas;
  const canvas = document.createElement("canvas");
  canvas.width = printCanvas.width;
  canvas.height = printCanvas.height;
  const ctx = canvas.getContext("2d")!;
  try {
    const reference = await loadImage(`/reference/madar-${side}.png`);
    ctx.drawImage(reference, 0, 0, canvas.width, canvas.height);
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const overlayCtx = overlay.getContext("2d")!;
    overlayCtx.drawImage(printCanvas, 0, 0);
    const pixels = overlayCtx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (
        pixels.data[i]! > 245 &&
        pixels.data[i + 1]! > 245 &&
        pixels.data[i + 2]! > 245
      )
        pixels.data[i + 3] = 0;
    }
    overlayCtx.putImageData(pixels, 0, 0);
    ctx.drawImage(overlay, 0, 0);
    return canvas;
  } catch {
    return printCanvas;
  }
}
