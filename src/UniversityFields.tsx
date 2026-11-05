import React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import type { Design, LayoutElement } from "./design";
import { UNIVERSITY_FIELDS, UNIVERSITY_PHOTO_ID, universityFieldValue, updateUniversityField, updateUniversityPhoto } from "./university";

export function UniversityFields({ design, update, select, upload }: {
  design: Design; update: (patch: Partial<Design>) => void; select: (id: string) => void; upload: () => void;
}) {
  const photo = design.elements.find((element) => element.id === UNIVERSITY_PHOTO_ID);
  function patchPhoto(patch: Partial<LayoutElement>) {
    update({ elements: design.elements.map((element) => element.id === UNIVERSITY_PHOTO_ID ? { ...element, ...patch } : element) });
    select(UNIVERSITY_PHOTO_ID);
  }
  return <div className="university-fields" dir="rtl">
    <div className="section-label">کارت دانشجویی<span>جندی‌شاپور دزفول</span></div>
    <p className="inspector-description">طرح دوطرفه مطابق نمونهٔ شما؛ مشخصات و عکس را وارد کنید. نقش، عنوان دانشگاه و برچسب‌های ثابت در طرح چاپ می‌شوند.</p>
    <div className="university-photo-controls">
      <button className="button secondary full" onClick={upload}><ImagePlus size={16} />{photo?.src ? "تغییر عکس پرسنلی" : "انتخاب عکس پرسنلی"}</button>
      {photo?.src && <>
        <button className="button secondary full" onClick={() => update({ elements: updateUniversityPhoto(design, "") })}><Trash2 size={14} />حذف عکس پرسنلی</button>
        {([
          ["imageZoom", "بزرگ‌نمایی عکس", 1, 3, 0.05, photo.imageZoom ?? 1],
          ["imageOffsetX", "جابه‌جایی افقی عکس", -1, 1, 0.05, photo.imageOffsetX ?? 0],
          ["imageOffsetY", "جابه‌جایی عمودی عکس", -1, 1, 0.05, photo.imageOffsetY ?? 0],
        ] as const).map(([key, label, min, max, step, value]) => <label className="field" key={key}>
          <span>{label}</span><input dir="ltr" type="range" min={min} max={max} step={step} value={value} onChange={(event) => patchPhoto({ [key]: Number(event.target.value) })} />
        </label>)}
      </>}
    </div>
    {UNIVERSITY_FIELDS.map((field) => <label className="field" key={field.key}>
      <span>{field.label}</span><input autoComplete="off" dir="rtl" value={universityFieldValue(design, field.key)}
        maxLength={field.limit} placeholder={field.placeholder} onChange={(event) => {
          update({ elements: updateUniversityField(design, field.key, event.target.value) });
          select(`university-${field.key}`);
        }} />
    </label>)}
    <p className="madar-memory-note">عکس و مشخصات شخصی با بارگذاری مجدد پاک می‌شوند. برای نگهداری آن‌ها، فایل طراحی را از بخش Export ذخیره کنید.</p>
    <p className="inspector-description">برای ویرایش نوشته‌های پشت کارت، نمای Back را انتخاب کنید؛ همهٔ نوشته‌ها و جای عکس از بخش لایه‌ها هم قابل تنظیم هستند.</p>
  </div>;
}
