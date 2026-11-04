import React, { useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, CreditCard, FileUp, Info, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  activeTrackMask, EMPTY_TRACKS, exportHiTiMagnetic, exportMagneticProject,
  HITI_MAGNETIC_SAMPLES, importMagneticFile, MAX_MAGNETIC_FILE_BYTES,
  MAX_MAGNETIC_RECORDS, normalizeTrackInput, parseHiTiMagnetic, TRACK_KEYS,
  TRACK_LIMITS, validateTracks, type Tracks,
} from "./magnetic";

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MagneticPanel({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<Tracks[]>([{ ...EMPTY_TRACKS }]);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const tracks = records[selected]!;
  const errors = validateTracks(tracks);
  const invalidRecords = records.flatMap((record, i) => validateTracks(record).length ? [i + 1] : []);
  function update(patch: Partial<Tracks>) {
    setRecords((previous) => previous.map((record, i) => i === selected ? { ...record, ...patch } : record));
    setMessage("");
    setFileError("");
  }
  function replace(next: Tracks[], notice: string) {
    setRecords(next);
    setSelected(0);
    setMessage(notice);
    setFileError("");
  }
  function exportFile(format: "txt" | "json") {
    try {
      download(format === "txt" ? exportHiTiMagnetic(records) : exportMagneticProject(records),
        format === "txt" ? "Magnetic.txt" : "magnetic-stripe.card.json",
        format === "txt" ? "text/plain;charset=utf-8" : "application/json");
      setMessage("فایل داده آماده شد؛ خروجی گرفتن، چیزی روی کارت نمی‌نویسد.");
      setFileError("");
    } catch (error) { setFileError((error as Error).message); }
  }
  async function importFile(file: File) {
    try {
      if (file.size > MAX_MAGNETIC_FILE_BYTES) throw new Error("حداکثر اندازهٔ فایل ۱ مگابایت است.");
      const next = importMagneticFile(await file.text(), tracks.coercivity);
      replace(next, `${next.length} رکورد وارد شد. نوع نوار هر کارت را پیش از استفاده بررسی کنید.`);
    } catch (error) { setFileError((error as Error).message); setMessage(""); }
  }
  return (
    <main className="secondary-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">HiTi CS-200e · MAGNETIC STRIPE</div>
          <h1>تنظیم نوار مغناطیسی<span>.</span></h1>
          <p dir="rtl">انتخاب ترک‌ها، تنظیم نوع نوار و آماده‌سازی فایل مطابق نمونهٔ درایور HiTi.</p>
        </div>
        <button className="button secondary" onClick={onBack}><ArrowLeft size={16} />بازگشت به طراحی</button>
      </div>
      <div className="magnetic-layout">
        <section className="magnetic-editor">
          <div className="magnetic-card"><CreditCard size={28} /><div /><span>MAGNETIC STRIPE · ISO 7811</span></div>
          <div className="magnetic-fields">
            <h2 dir="rtl">تنظیمات و دادهٔ ترک‌ها</h2>
            <p dir="rtl">هر رکورد دادهٔ یک کارت است. ترک خالی در فایل خروجی انتخاب نمی‌شود. ورود فایل یا بارگذاری نمونه‌ها، فهرست فعلی را جایگزین می‌کند.</p>
            <div className="magnetic-toolbar">
              <button className="button secondary" onClick={() => fileInput.current?.click()}><FileUp size={16} />ورود TXT / JSON</button>
              <button className="button secondary" onClick={() => replace(parseHiTiMagnetic(HITI_MAGNETIC_SAMPLES, tracks.coercivity), "۷ نمونهٔ اصلی Magnetic.txt بارگذاری شد؛ این داده‌ها آزمایشی هستند.")}>۷ نمونهٔ HiTi</button>
              <input ref={fileInput} type="file" accept=".txt,.json" hidden onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.target.value = "";
              }} />
            </div>
            <div className="magnetic-record-controls">
              <label className="field"><span>رکورد / کارت</span>
                <select value={selected} onChange={(event) => { setSelected(Number(event.target.value)); setMessage(""); setFileError(""); }}>
                  {records.map((record, i) => <option key={i} value={i}>{i + 1} — Track {activeTrackMask(record) || "خالی"}{validateTracks(record).length ? " · نیاز به تکمیل" : ""}</option>)}
                </select>
              </label>
              <button className="button secondary" disabled={records.length >= MAX_MAGNETIC_RECORDS} onClick={() => {
                setRecords([...records, { ...EMPTY_TRACKS, coercivity: tracks.coercivity }]);
                setSelected(records.length); setMessage(""); setFileError("");
              }}><Plus size={16} />کارت جدید</button>
              <button className="button secondary" aria-label="حذف رکورد فعلی" onClick={() => replace(records.length === 1 ? [{ ...EMPTY_TRACKS, coercivity: tracks.coercivity }] : records.filter((_, i) => i !== selected), "رکورد حذف شد.")}><Trash2 size={16} /></button>
            </div>
            <label className="field">
              <span>نوع نوار — مطابق کارت فیزیکی</span>
              <select value={tracks.coercivity} onChange={(event) => update({ coercivity: event.target.value as Tracks["coercivity"] })}>
                <option value="HiCo">HiCo — high coercivity</option>
                <option value="LoCo">LoCo — low coercivity</option>
              </select>
              <small className="track-hint" dir="rtl">نوع نوار در JSON حفظ می‌شود. قالب Magnetic.txt این تنظیم را ندارد؛ آن را در ابزار انکودر هم انتخاب کنید.</small>
            </label>
            {TRACK_KEYS.map((key, i) => (
              <label className="field" key={key}>
                <span>Track {i + 1} — {i === 1 ? "شناسه / شمارهٔ عضویت" : "اختیاری"}</span>
                <input dir="ltr" autoComplete="off" spellCheck={false}
                  value={tracks[key]} aria-invalid={Boolean(tracks[key] && validateTracks({ ...EMPTY_TRACKS, [key]: tracks[key] }).length)}
                  onChange={(event) => update({ [key]: normalizeTrackInput(event.target.value) })}
                  placeholder="ترک استفاده‌نشده را خالی بگذارید" />
                <small className="track-hint" dir="rtl">{tracks[key].length} / {TRACK_LIMITS[i]} نویسه · {i === 0 ? "حروف بزرگ و علائم ASCII" : "ارقام انگلیسی و ="}</small>
              </label>
            ))}
            <p className="track-hint" dir="rtl">ارقام فارسی و عربی هنگام ورود به انگلیسی تبدیل می‌شوند. داده را بدون نشانه‌های شروع/پایان و LRC وارد کنید.</p>
            {errors.length > 0 && TRACK_KEYS.some((key) => tracks[key]) && <div className="inline-note" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
            <div className="magnetic-summary" dir="rtl">
              <strong>{records.length} کارت · ترک‌های رکورد فعلی: <bdi>{activeTrackMask(tracks) || "هیچ‌کدام"}</bdi></strong>
              <span>{invalidRecords.length ? `رکوردهای نیازمند اصلاح: ${invalidRecords.join("، ")}` : "دادهٔ همهٔ رکوردها معتبر است."}</span>
            </div>
            {fileError && <div className="inline-note" role="alert" dir="rtl">{fileError}</div>}
            {message && <div className="inline-note" role="status" dir="rtl">{message}</div>}
            <button className="button primary full" disabled={invalidRecords.length > 0} onClick={() => exportFile("txt")}><ArrowDownToLine size={16} />خروجی Magnetic.txt برای MagTest</button>
            <button className="button secondary full" disabled={invalidRecords.length > 0} onClick={() => exportFile("json")}><ArrowDownToLine size={16} />ذخیرهٔ تنظیمات و داده‌ها — JSON</button>
            <button className="button secondary full" onClick={() => replace([{ ...EMPTY_TRACKS }], "داده‌های نوار پاک شد.")}><Trash2 size={16} />پاک کردن همهٔ داده‌ها</button>
            <div className="field-hint"><ShieldCheck size={15} />داده‌ها فقط در حافظه می‌مانند؛ با خروج از صفحه پاک می‌شوند. فایل خروجی شامل داده‌های واردشده است.</div>
          </div>
        </section>
        <aside className="encoder-status" dir="rtl">
          <span className="modal-icon"><Info size={25} /></span>
          <div className="eyebrow">قالب استخراج‌شده از نمونهٔ HiTi</div>
          <h2>تنظیم داده آماده است؛<br />نوشتن روی کارت به رابط انکودر نیاز دارد.</h2>
          <p>نمونهٔ همراه درایور از قالب زیر استفاده می‌کند: شمارهٔ ترک‌های فعال، یک فاصله، سپس دادهٔ هر ترک به ترتیب شماره.</p>
          <pre className="magnetic-format" dir="ltr">{"2 12345678\n12 HIJKLMN 12345678\n123 HIJKLMN 2468024680 0987654321"}</pre>
          <p>خروجی TXT همین ساختار را با پایان سطر ویندوز تولید می‌کند. برای حفظ نوع نوار و باز کردن مجدد تنظیمات، از JSON استفاده کنید.</p>
          <div className="inline-note">ابزار نوشتن همراه نمونه‌ها مخصوص ویندوز است و در مک مستقیماً اجرا نمی‌شود. تنظیم داده و خروجی فایل در این صفحه در دسترس است؛ نوشتن مستقیم روی کارت هنوز پشتیبانی نمی‌شود.</div>
          <p>درایور چاپ نصب‌شدهٔ مک، گزینه‌ای برای ارسال دادهٔ ترک‌ها ندارد. انتخاب نوع کارت مغناطیسی در چاپ، دادهٔ نوار را تغییر نمی‌دهد.</p>
          <button className="button secondary full" disabled aria-describedby="encoder-unavailable"><CreditCard size={16} />نوشتن مستقیم روی کارت — در دسترس نیست</button>
          <p id="encoder-unavailable">برای نوشتن واقعی از ابزار HiTi در ویندوز با وابستگی‌های انکودر استفاده کنید، یا SDK سازگار با macOS را به برنامه متصل کنید. خروجی فایل به معنی نوشته شدن کارت نیست.</p>
        </aside>
      </div>
    </main>
  );
}
