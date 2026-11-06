import React, { useRef, useState } from "react";
import { elementId } from "./id";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ImagePlus,
  Plus,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import {
  cardDimensions,
  createElement,
  type Design,
  type LayoutElement,
  type Side,
} from "./design";

type Props = {
  design: Design;
  side: Side;
  selected: string;
  select: (id: string) => void;
  update: (patch: Partial<Design>) => void;
  upload: () => void;
};

export function LayoutControls({
  design,
  side,
  selected,
  select,
  update,
  upload,
}: Props) {
  const element = design.elements.find(
    (e) => e.id === selected && e.side === side,
  );
  function patch(value: Partial<LayoutElement>) {
    if (element)
      update({
        elements: design.elements.map((e) =>
          e.id === element.id ? { ...e, ...value } : e,
        ),
      });
  }
  function add(kind: "text" | "rect") {
    const e = createElement(
      side,
      kind === "rect"
        ? { kind, text: "", width: 25, height: 8, color: design.accent }
        : {},
    );
    update({ elements: [...design.elements, e] });
    select(e.id);
  }
  function reorder(delta: number) {
    if (!element) return;
    const copy = [...design.elements];
    const index = copy.findIndex((e) => e.id === element.id);
    const target = index + delta;
    if (target < 0 || target >= copy.length) return;
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
    update({ elements: copy });
  }
  const number = (
    key: "x" | "y" | "width" | "height" | "fontSize" | "rotation",
    label: string,
    min = 0,
    max = 100,
  ) =>
    element && (
      <label className="field">
        <span>{label}</span>
        <input
          type="number"
          step={key === "rotation" ? 1 : 0.5}
          min={min}
          max={max}
          value={Math.round(element[key] * 100) / 100}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value))
              patch({ [key]: Math.max(min, Math.min(max, value)) });
          }}
        />
      </label>
    );
  const dims = cardDimensions(design.orientation);
  return (
    <>
      <div className="section-label">
        FREE LAYOUT <span>{side.toUpperCase()}</span>
      </div>
      <div className="add-element-buttons">
        <button
          onClick={() => add("text")}
          disabled={design.elements.length >= 80}
        >
          <Type size={17} />
          Text
        </button>
        <button onClick={upload} disabled={design.elements.length >= 80}>
          <ImagePlus size={17} />
          Image
        </button>
        <button
          onClick={() => add("rect")}
          disabled={design.elements.length >= 80}
        >
          <Square size={17} />
          Shape
        </button>
      </div>
      <p className="inspector-description">
        Add anything, then drag it on the card. Fine-tune its position in
        millimeters below.
      </p>
      <div className="layer-list">
        {design.elements
          .filter((e) => e.side === side)
          .map((e) => (
            <button
              key={e.id}
              className={e.id === selected ? "selected" : ""}
              onClick={() => select(e.id)}
            >
              {e.kind === "text" ? (
                <Type size={13} />
              ) : e.kind === "image" ? (
                <ImagePlus size={13} />
              ) : (
                <Square size={13} />
              )}
              <span>
                {e.kind === "text"
                  ? e.text || "Empty text"
                  : e.kind === "image"
                    ? "Image"
                    : "Shape"}
              </span>
            </button>
          ))}
      </div>
      {!element ? (
        <div className="layout-empty">
          <Plus size={18} />
          <span>
            {design.elements.some((e) => e.side === side)
              ? "Select an element to edit it."
              : "Start with text, an image, or a shape."}
          </span>
        </div>
      ) : (
        <div className="element-settings">
          <div className="section-label spaced">
            SELECTED ELEMENT
            <div className="element-actions">
              <button
                title="Move backward"
                aria-label="Move element backward"
                onClick={() => reorder(-1)}
              >
                <ArrowDown size={13} />
              </button>
              <button
                title="Move forward"
                aria-label="Move element forward"
                onClick={() => reorder(1)}
              >
                <ArrowUp size={13} />
              </button>
              <button
                title="Duplicate"
                aria-label="Duplicate element"
                disabled={design.elements.length >= 80}
                onClick={() => {
                  const e = {
                    ...element,
                    id: elementId(),
                    x: Math.min(element.x + 2, dims.widthMm - 4),
                    y: Math.min(element.y + 2, dims.heightMm - 4),
                  };
                  update({ elements: [...design.elements, e] });
                  select(e.id);
                }}
              >
                <Copy size={13} />
              </button>
              <button
                title="Delete"
                aria-label="Delete element"
                onClick={() => {
                  update({
                    elements: design.elements.filter(
                      (e) => e.id !== element.id,
                    ),
                  });
                  select("");
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {element.kind === "text" && (
            <>
              <label className="field">
                <span>Text / card number</span>
                <textarea
                  rows={3}
                  dir="auto"
                  maxLength={2000}
                  value={element.text}
                  onChange={(e) => patch({ text: e.target.value })}
                />
              </label>
              <div className="two-fields">
                <label className="field">
                  <span>Font</span>
                  <select
                    value={element.font}
                    onChange={(e) =>
                      patch({ font: e.target.value as LayoutElement["font"] })
                    }
                  >
                    <option value="sans">Sans serif</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Monospace</option>
                    <option value="persian">Persian / Naskh</option>
                  </select>
                </label>
                {number("fontSize", "Size (pt)", 3, 100)}
              </div>
              <div className="two-fields">
                <label className="field">
                  <span>Weight</span>
                  <select
                    value={element.bold ? "bold" : "regular"}
                    onChange={(e) => patch({ bold: e.target.value === "bold" })}
                  >
                    <option value="regular">Regular</option>
                    <option value="bold">Bold</option>
                  </select>
                </label>
                <label className="field">
                  <span>Alignment</span>
                  <select
                    value={element.align}
                    onChange={(e) =>
                      patch({ align: e.target.value as LayoutElement["align"] })
                    }
                  >
                    <option value="left">Left / auto RTL</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
            </>
          )}
          <div className="two-fields">
            {number("x", "Left (mm)", 0, dims.widthMm)}
            {number("y", "Top (mm)", 0, dims.heightMm)}
          </div>
          <div className="two-fields">
            {number("width", "Width (mm)", 1, dims.widthMm)}
            {number("height", "Height (mm)", 1, dims.heightMm)}
          </div>
          <div className="two-fields">
            {number("rotation", "Rotation (°)", -360, 360)}
            {element.kind !== "image" && (
              <label className="field">
                <span>Color</span>
                <input
                  aria-label="Element color"
                  className="element-color"
                  type="color"
                  value={element.color}
                  onChange={(e) => patch({ color: e.target.value })}
                />
              </label>
            )}
          </div>
          <p className="inspector-description">
            The outlined box is the element’s print area. Increase its width or
            height if text is clipped. Selection guides never print.
          </p>
        </div>
      )}
    </>
  );
}

export function LayoutOverlay({
  design,
  side,
  selected,
  select,
  update,
}: Omit<Props, "upload">) {
  const dims = cardDimensions(design.orientation);
  const drag = useRef<{
    id: string;
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [pending, setPending] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  function position(event: React.PointerEvent) {
    const d = drag.current!;
    return {
      id: d.id,
      x: Math.max(
        0,
        Math.min(
          dims.widthMm - 1,
          d.x + ((event.clientX - d.clientX) / d.width) * dims.widthMm,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          dims.heightMm - 1,
          d.y + ((event.clientY - d.clientY) / d.height) * dims.heightMm,
        ),
      ),
    };
  }
  return (
    <div className="layout-overlay" aria-label="Card layout elements">
      {design.elements
        .filter((e) => e.side === side)
        .map((e) => {
          const current = pending?.id === e.id ? pending : e;
          return (
            <button
              type="button"
              className={`element-hitbox ${selected === e.id ? "selected" : ""} ${pending?.id === e.id ? "dragging" : ""}`}
              key={e.id}
              aria-label={`Select ${e.kind}: ${e.text || e.kind}`}
              style={{
                left: `${(current.x / dims.widthMm) * 100}%`,
                top: `${(current.y / dims.heightMm) * 100}%`,
                width: `${(e.width / dims.widthMm) * 100}%`,
                height: `${(e.height / dims.heightMm) * 100}%`,
                transform: `rotate(${e.rotation}deg)`,
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                select(e.id);
                const bounds =
                  event.currentTarget.parentElement!.getBoundingClientRect();
                drag.current = {
                  id: e.id,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  x: e.x,
                  y: e.y,
                  width: bounds.width,
                  height: bounds.height,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (drag.current?.id === e.id) setPending(position(event));
              }}
              onPointerUp={(event) => {
                if (!drag.current || drag.current.id !== e.id) return;
                const p = position(event);
                drag.current = null;
                setPending(null);
                if (Math.abs(p.x - e.x) > 0.02 || Math.abs(p.y - e.y) > 0.02)
                  update({
                    elements: design.elements.map((item) =>
                      item.id === e.id ? { ...item, x: p.x, y: p.y } : item,
                    ),
                  });
              }}
              onPointerCancel={() => {
                drag.current = null;
                setPending(null);
              }}
              onKeyDown={(event) => {
                const delta = event.shiftKey ? 2 : 0.5;
                const move =
                  event.key === "ArrowLeft"
                    ? { x: Math.max(0, e.x - delta) }
                    : event.key === "ArrowRight"
                      ? { x: Math.min(dims.widthMm - 1, e.x + delta) }
                      : event.key === "ArrowUp"
                        ? { y: Math.max(0, e.y - delta) }
                        : event.key === "ArrowDown"
                          ? { y: Math.min(dims.heightMm - 1, e.y + delta) }
                          : null;
                if (move) {
                  event.preventDefault();
                  update({
                    elements: design.elements.map((item) =>
                      item.id === e.id ? { ...item, ...move } : item,
                    ),
                  });
                }
              }}
            >
              <span>
                {pending?.id === e.id
                  ? `${current.x.toFixed(1)}, ${current.y.toFixed(1)} mm`
                  : e.kind === "text"
                    ? "Text"
                    : e.kind === "image"
                      ? "Image"
                      : "Shape"}
              </span>
            </button>
          );
        })}
    </div>
  );
}
