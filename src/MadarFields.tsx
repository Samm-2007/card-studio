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
        YOUR PREPRINTED CARD<span>BACK · PORTRAIT</span>
      </div>
      <p className="inspector-description">
        Matches your example. Enter the details, then adjust any text box below.
        The existing stripe and logo are guides only.
      </p>
      <label className="field">
        <span>نام دارنده / holder name</span>
        <textarea
          dir="rtl"
          rows={3}
          autoComplete="off"
          maxLength={100}
          value={madarFieldValue(design, "holder")}
          placeholder={"نام\nنام خانوادگی\nنام تکمیلی"}
          onChange={(e) => change("holder", e.target.value)}
        />
      </label>
      <label className="field">
        <span>شماره کارت / card number</span>
        <input
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={24}
          value={madarFieldValue(design, "number")}
          placeholder="16 digits"
          onChange={(e) => change("number", e.target.value)}
        />
        <small>
          Shown as four groups, stacked vertically in Persian digits.
        </small>
      </label>
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
