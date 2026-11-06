import { cardDimensions, renderCard, type Design, type Side } from "./design";

export function browserPrintStyles(orientation: Design["orientation"]): string {
  const { widthMm, heightMm } = cardDimensions(orientation);
  return `
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { background: #eee; font: 15px Arial, sans-serif; }
    .instructions { max-width: 600px; margin: 20px auto; padding: 18px; background: white; line-height: 1.8; }
    button { padding: 10px 24px; cursor: pointer; }
    .card { display: block; width: ${widthMm}mm; height: ${heightMm}mm; margin: 20px auto; }
    @media print {
      html, body { width: ${widthMm}mm; height: ${heightMm}mm; background: white; }
      .instructions { display: none !important; }
      .card { margin: 0; break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `;
}

// Call directly from a click handler: create the window before asynchronous rendering
// so browsers do not block it. Only the actual artwork is sent to this computer's dialog.
export async function printOnThisComputer(design: Design, side: Side): Promise<void> {
  const target = window.open("", "_blank", "width=760,height=700");
  if (!target) throw new Error("مرورگر پنجرهٔ چاپ را مسدود کرد. Pop-ups را برای این سایت مجاز کن و دوباره چاپ بزن.");
  try {
    const doc = target.document;
    doc.title = "Card Studio — چاپ روی همین کامپیوتر";
    doc.documentElement.lang = "fa";
    doc.body.replaceChildren();
    const style = doc.createElement("style");
    style.textContent = browserPrintStyles(design.orientation);
    doc.head.append(style);
    const instructions = doc.createElement("section");
    instructions.className = "instructions";
    instructions.dir = "rtl";
    const text = doc.createElement("p");
    text.textContent = "در حال آماده‌سازی کارت…";
    instructions.append(text);
    doc.body.append(instructions);
    const canvas = await renderCard(design, side);
    if (target.closed) throw new Error("پنجرهٔ چاپ بسته شد؛ چیزی به چاپگر ارسال نشد.");
    const image = doc.createElement("img");
    image.className = "card";
    image.alt = side === "back" ? "پشت کارت" : "روی کارت";
    const ready = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("آماده‌سازی تصویر چاپ ناموفق بود."));
    });
    image.src = canvas.toDataURL("image/png");
    doc.body.append(image);
    await ready;
    text.textContent = "چاپگر HiTi متصل به همین کامپیوتر را انتخاب کن. اندازهٔ کاغذ: CR80؛ مقیاس: ۱۰۰٪ / Actual size؛ حاشیه: صفر؛ سربرگ و پابرگ: خاموش. تعداد نسخه‌ها، نوع ریبون و تنظیمات کارت را در پنجرهٔ چاپ و تنظیمات درایور ویندوز تعیین کن. برای پشت کارت، جهت قرارگیری کارت را بررسی کن. هر بار فقط یک سمت چاپ می‌شود.";
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = "باز کردن پنجرهٔ چاپ";
    button.onclick = () => { target.focus(); target.print(); };
    instructions.append(button);
    await new Promise<void>((resolve) => target.requestAnimationFrame(() => target.requestAnimationFrame(() => resolve())));
    target.focus();
    target.print();
  } catch (error) {
    target.close();
    throw error;
  }
}
