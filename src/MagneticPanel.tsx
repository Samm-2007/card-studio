import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

export function MagneticPanel({ number, onBack, onPrint }: {
  number: string; onBack: () => void; onPrint: () => void;
}) {
  return <main className="secondary-page" dir="rtl">
    <div className="page-heading">
      <div><h1>نوار مغناطیسی</h1><p>شماره از فیلد Card / member number خوانده می‌شود.</p></div>
      <button className="button secondary" onClick={onBack}><ArrowLeft size={16}/>ویرایش مشخصات کارت</button>
    </div>
    <section className="magnetic-fields">
      <label className="field"><span>شماره کارت — متصل به نوار مغناطیسی</span>
        <input dir="ltr" readOnly value={number} placeholder="شماره را در مشخصات کارت وارد کن" />
      </label>
      <p>تا ۳۷ نویسه روی Track 2؛ مقدار بلندتر تا ۶۶ نویسه روی Track 3 نوشته می‌شود. فقط رقم و = مجاز است؛ کارت‌خوان باید ترک انتخاب‌شده را بخواند.</p>
      <button className="button primary" disabled={!number} onClick={onPrint}><Printer size={16}/>چاپ و ارسال شماره به نوار</button>
    </section>
  </main>;
}
