import React from "react";
import type { Design } from "./design";
import { madarFieldValue, updateMadarField, type MadarField } from "./madar";

export function MadarFields({
  design,
  update,
  select,
}: {
  design: Design;
  update: (patch: Partial<Design>) => void;
  select: (id: string) => void;
}) {
  const change = (field: MadarField, text: string) => {
    update({ elements: updateMadarField(design, field, text) });
    select(`madar-${field}`);
  };
  return (
    <div className="madar-fields">
      <div className="section-label">
        مشخصات کارت<span>پشت کارت</span>
      </div>
      <p className="inspector-description">
        نام و نام خانوادگی و شماره کارت را وارد کن.
      </p>
      <label className="field">
        <span>نام و نام خانوادگی</span>
        <input
          type="text"
          dir="rtl"
          autoComplete="off"
          maxLength={100}
          value={madarFieldValue(design, "holder")}
          placeholder="نام و نام خانوادگی"
          onChange={(e) => change("holder", e.target.value)}
        />
      </label>
      <label className="field">
        <span>Card / member number</span>
        <input
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={19}
          value={madarFieldValue(design, "number")}
          placeholder="شماره کارت (تا ۱۶ رقم)"
          onChange={(e) => change("number", e.target.value)}
        />
        <small>
          همین شماره به نوار مغناطیسی ارسال می‌شود.
        </small>
      </label>
      <details>
        <summary>مشخصات تکمیلی (اختیاری)</summary>
      <div className="two-fields">
        <label className="field">
          <span>تاریخ / expiry</span>
          <input
            dir="ltr"
            autoComplete="off"
            maxLength={7}
            value={madarFieldValue(design, "expiry")}
            placeholder="MM/YY"
            onChange={(e) => change("expiry", e.target.value)}
          />
        </label>
        <label className="field">
          <span>CVV2</span>
          <input
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={madarFieldValue(design, "cvv2")}
            placeholder="CVV2"
            onChange={(e) =>
              change("cvv2", e.target.value.replace(/[^0-9۰-۹٠-٩]/g, ""))
            }
          />
        </label>
      </div>
      </details>
      <p className="madar-memory-note">
        Layout auto-saves. Entered card details stay in this tab and are cleared
        on reload.
      </p>
      <details className="madar-adjust">
        <summary>Adjust positions or add more text</summary>
        <p className="inspector-description">
          All fields are editable layers below. Keep text to the right of the
          stripe and above the logo. Use 1 card to check alignment.
        </p>
      </details>
    </div>
  );
}
