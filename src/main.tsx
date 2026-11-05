import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  FileImage,
  FolderOpen,
  ImagePlus,
  Layers2,
  LayoutTemplate,
  LoaderCircle,
  PanelTop,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  Palette,
} from "lucide-react";
import { CARD, makePdf } from "./pdf";
import {
  DEFAULT_DESIGN,
  cardDimensions,
  createElement,
  customDesign,
  loadImage,
  renderCard,
  templateDesign,
  validateDesign,
  type Design,
  type Side,
  type Template,
} from "./design";
import { LayoutControls, LayoutOverlay } from "./LayoutEditor";
import { MagneticPanel } from "./MagneticPanel";
import { MadarFields } from "./MadarFields";
import { UniversityFields } from "./UniversityFields";
import { updateUniversityPhoto, UNIVERSITY_PHOTO_ID } from "./university";
import { designForAutosave } from "./madar";
import { referencePreview } from "./reference";
import {
  DRIVER_KEYS,
  RIBBON_LABELS,
  isMonochromeRibbon,
  type DriverOption,
  type Printer as PrinterInfo,
} from "./printer";
import "./styles.css";

type Device = PrinterInfo & { options: DriverOption[] };
type Status = {
  token: string;
  driverInstalled: boolean;
  utilityInstalled: boolean;
  printers: Device[];
  defaultPrinter?: string | null;
  error: string | null;
};
type Job = {
  id: string;
  copies: number;
  sides: number;
  createdAt: string;
  status: string;
  active?: boolean;
  message?: string;
};
type View = "design" | "queue" | "printer" | "magnetic";
const templates: {
  id: Template;
  name: string;
  description: string;
  badge: string;
}[] = [
  { id: "university", name: "کارت دانشجویی جندی‌شاپور", description: "UNIVERSITY · TWO-SIDED", badge: "دانشجو" },
  {
    id: "madar",
    name: "Your Madar card",
    description: "MADAR · PREPRINTED",
    badge: "مادر",
  },
  {
    id: "membership",
    name: "The belonging club",
    description: "MEMBERSHIP",
    badge: "a.",
  },
  {
    id: "business",
    name: "A proper introduction",
    description: "BUSINESS",
    badge: "Hello.",
  },
  {
    id: "minimal",
    name: "Less, but better",
    description: "MINIMAL",
    badge: "A / M",
  },
  {
    id: "custom",
    name: "Your own layout",
    description: "BLANK / PREPRINTED",
    badge: "+",
  },
];
const storageKey = "hiti-card-studio-design-v1";
function initialDesign() {
  if (new URLSearchParams(window.location.search).get("layout") === "university")
    return templateDesign("university", DEFAULT_DESIGN);
  if (new URLSearchParams(window.location.search).get("layout") === "madar")
    return templateDesign("madar", DEFAULT_DESIGN);
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return validateDesign(JSON.parse(stored));
  } catch {
    /* Fall back if local storage is unavailable or from an old version. */
  }
  return DEFAULT_DESIGN;
}
function download(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const readable: Record<string, Record<string, string>> = {
  CardType: {
    "0": "Blank PVC card",
    "1": "6-pin chip card",
    "2": "8-pin chip card",
    "3": "Magnetic stripe",
    "4": "Chip + magnetic stripe",
    "5": "Adhesive card",
  },
  CardThick: { "0": "0.3 mm", "1": "0.5 mm", "2": "0.8 mm", "3": "1.0 mm" },
  ColorPreference: {
    Basic: "HiTi Basic Color",
    Classic: "HiTi Classic Color",
    None: "No color preference",
  },
  Rotate180Front: { "0": "Normal", "1": "Rotate 180°" },
  Rotate180Back: { "0": "Normal", "1": "Rotate 180°" },
};

function App() {
  const [design, setDesign] = useState<Design>(initialDesign);
  const [selectedElement, setSelectedElement] = useState("");
  const isFree = design.template === "custom" || design.template === "madar" || design.template === "university";
  const [showReference, setShowReference] = useState(true);
  const [previews, setPreviews] = useState({ front: "", back: "" });
  const dims = cardDimensions(design.orientation);
  const [undo, setUndo] = useState<Design[]>([]);
  const [redo, setRedo] = useState<Design[]>([]);
  const [view, setView] = useState<View>(
    new URLSearchParams(window.location.search).get("view") === "magnetic"
      ? "magnetic"
      : "design",
  );
  const [side, setSide] = useState<Side>(
    design.template === "madar" ? "back" : "front",
  );
  const [tab, setTab] = useState<"content" | "style">("content");
  const [images, setImages] = useState({ front: "", back: "" });
  const [safeArea, setSafeArea] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [status, setStatus] = useState<Status | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [settings, setSettings] = useState<Record<string, string>>({
    RibbonType: "YMCKO",
    ...(design.template === "madar" ? { CardType: "3" } : {}),
  });
  const [settingsReadyFor, setSettingsReadyFor] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [copies, setCopies] = useState(1);
  const [printSide, setPrintSide] = useState<"front" | "back" | "both">(
    design.template === "madar" ? "back" : "front",
  );
  const [duplex, setDuplex] = useState(false);
  const [modal, setModal] = useState<"print" | "setup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [saveState, setSaveState] = useState("Saved on this Mac");
  const [exporting, setExporting] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<
    "logo" | "frontArtwork" | "backArtwork" | "element" | "university-photo"
  >("logo");
  const printer = status?.printers.find((p) => p.name === selectedPrinter);
  const artworkKey = side === "front" ? "frontArtwork" : "backArtwork";
  const selectedRibbon =
    settings.RibbonType ??
    printer?.options.find((o) => o.key === "RibbonType")?.defaultValue ??
    "YMCKO";
  const colorConflict =
    !design.monochrome && isMonochromeRibbon(selectedRibbon);
  const availableRibbons =
    printer?.options.find((o) => o.key === "RibbonType")?.values ??
    Object.keys(RIBBON_LABELS);
  function enableColor() {
    const ribbon = availableRibbons.includes("YMCKO")
      ? "YMCKO"
      : availableRibbons.find((value) => !isMonochromeRibbon(value));
    if (!ribbon) {
      notify(
        "این صف چاپ ریبون رنگی ارائه نمی‌کند. درایور HiTi را بررسی کنید.",
        true,
      );
      return;
    }
    update({ monochrome: false });
    setSettings((previous) => ({ ...previous, RibbonType: ribbon }));
  }
  function notify(message: string, error = false) {
    setToast({ message, error });
  }
  function chooseTemplate(template: Template) {
    update(templateDesign(template, design));
    setSelectedElement("");
    setTab("content");
    setView("design");
    setSide(template === "madar" ? "back" : "front");
    if (template === "university") {
      setPrintSide("front");
      setSettings((previous) => ({ ...previous, CardType: "0" }));
    }
    if (template === "madar") {
      setSettings((previous) => ({
        ...previous,
        CardType: "3",
      }));
      setPrintSide("back");
    }
  }
  function update(patch: Partial<Design>) {
    setUndo((previous) => [...previous.slice(-29), design]);
    setRedo([]);
    setDesign((current) => ({ ...current, ...patch }));
  }
  function undoDesign() {
    if (!undo.length) return;
    setRedo((previous) => [...previous, design]);
    setDesign(undo.at(-1)!);
    setUndo((previous) => previous.slice(0, -1));
  }
  function redoDesign() {
    if (!redo.length) return;
    setUndo((previous) => [...previous, design]);
    setDesign(redo.at(-1)!);
    setRedo((previous) => previous.slice(0, -1));
  }
  async function api(path: string, body?: unknown) {
    const res = await fetch(
      path,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Card-Studio-Token": status?.token || "",
            },
            body: JSON.stringify(body),
          },
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Could not connect to your Mac.");
    return data;
  }
  async function refresh() {
    setRefreshing(true);
    try {
      const data: Status = await api("/api/status");
      setStatus(data);
      setSelectedPrinter((previous) =>
        data.printers.some((p) => p.name === previous)
          ? previous
          : data.printers.find((p) => p.name === data.defaultPrinter)?.name ||
            data.printers[0]?.name || "",
      );
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setRefreshing(false);
    }
  }
  async function refreshJobs() {
    try {
      const data = await api("/api/jobs");
      setJobs(data.jobs);
    } catch (err) {
      notify((err as Error).message, true);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (view !== "queue") return;
    void refreshJobs();
    const timer = setInterval(refreshJobs, 8000);
    return () => clearInterval(timer);
  }, [view]);
  useEffect(() => {
    const defaults = {
      CardType: printer?.options.find((o) => o.key === "CardType")?.defaultValue ?? "0",
      CardThick: printer?.options.find((o) => o.key === "CardThick")?.defaultValue ?? "2",
      RibbonType:
        printer?.options.find((o) => o.key === "RibbonType")?.defaultValue ??
        "YMCKO",
      ...(design.template === "madar" ? { CardType: "3" } : {}),
    };
    try {
      const saved = localStorage.getItem(
        `hiti-card-studio-color-printer-${selectedPrinter}`,
      );
      const legacy = JSON.parse(
        localStorage.getItem(`hiti-card-studio-printer-${selectedPrinter}`) ||
          "{}",
      );
      setSettings(
        saved
          ? { ...defaults, ...JSON.parse(saved) }
          : { ...legacy, ...defaults },
      );
    } catch {
      setSettings(defaults);
    }
    setSettingsReadyFor(selectedPrinter);
    setDuplex(false);
  }, [selectedPrinter]);
  useEffect(() => {
    if (
      selectedPrinter &&
      settingsReadyFor === selectedPrinter &&
      Object.keys(settings).length
    ) {
      try {
        localStorage.setItem(
          `hiti-card-studio-color-printer-${selectedPrinter}`,
          JSON.stringify(settings),
        );
      } catch {
        /* The visible driver settings still work without storage. */
      }
    }
  }, [settings, selectedPrinter, settingsReadyFor]);
  useEffect(() => {
    let active = true;
    Promise.all([renderCard(design, "front"), renderCard(design, "back")])
      .then(async ([front, back]) => {
        const [previewFront, previewBack] = await Promise.all([
          referencePreview(design, "front", front, showReference),
          referencePreview(design, "back", back, showReference),
        ]);
        if (active)
          setPreviews({
            front: previewFront.toDataURL("image/png"),
            back: previewBack.toDataURL("image/png"),
          });
        if (active)
          setImages({
            front: front.toDataURL("image/png"),
            back: back.toDataURL("image/png"),
          });
      })
      .catch((err) => notify(err.message, true));
    return () => {
      active = false;
    };
  }, [design, showReference]);
  useEffect(() => {
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(designForAutosave(design)),
        );
        setSaveState(
          design.elements.some((e) => e.private)
            ? "Layout saved · details temporary"
            : "Saved on this Mac",
        );
      } catch {
        setSaveState("Download a backup to save");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [design]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const focus = document.activeElement as HTMLElement;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(null);
      if (event.key === "Tab") {
        const elements = [
          ...document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled), .modal input, .modal select, .modal a[href]",
          ),
        ];
        const first = elements[0],
          last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.querySelector<HTMLElement>(".modal button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      focus?.focus();
    };
  }, [modal, busy]);
  async function importImage(file?: File) {
    if (!file) return;
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 15_000_000
      )
        throw new Error("Choose a PNG, JPEG or WebP image under 15 MB.");
      const url = URL.createObjectURL(file);
      try {
        const image = await loadImage(url);
        const logo = uploadTarget.current === "logo";
        if (image.width * image.height > 60_000_000)
          throw new Error(
            "This image is too large. Resize it before uploading.",
          );
        const c = document.createElement("canvas");
        const scale = Math.min(
          1,
          (logo ? 600 : 1600) / Math.max(image.width, image.height),
        );
        c.width = Math.round(image.width * scale);
        c.height = Math.round(image.height * scale);
        const ctx = c.getContext("2d")!;
        if (!logo) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, c.width, c.height);
        }
        ctx.drawImage(image, 0, 0, c.width, c.height);
        const data = c.toDataURL(logo ? "image/png" : "image/jpeg", 0.94);
        if (data.length > 2_500_000)
          throw new Error("This image is too detailed. Try a smaller version.");
        if (uploadTarget.current === "university-photo") {
          if (!design.elements.some((element) => element.id === UNIVERSITY_PHOTO_ID) && design.elements.length >= 80)
            throw new Error("A design can contain up to 80 elements.");
          update({ elements: updateUniversityPhoto(design, data) });
          setSide("front");
          setSelectedElement(UNIVERSITY_PHOTO_ID);
        } else if (uploadTarget.current === "element") {
          const base = isFree ? design : customDesign(design);
          if (base.elements.length >= 80)
            throw new Error("A design can contain up to 80 elements.");
          const element = createElement(side, {
            kind: "image",
            text: "",
            src: data,
            width: Math.min(30, dims.widthMm - 12),
            height: Math.min(40, (30 * image.height) / image.width),
          });
          update({ ...base, elements: [...base.elements, element] });
          setSelectedElement(element.id);
        } else update({ [uploadTarget.current]: data });
        notify(
          uploadTarget.current === "university-photo"
            ? "عکس پرسنلی جایگزین شد؛ کادر و تناسب عکس حفظ شده است."
            : logo
            ? "Logo added to both sides."
            : uploadTarget.current === "element"
              ? "Image added. Drag it into position."
              : `Artwork added to the ${side}.`,
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      notify((err as Error).message, true);
    }
  }
  function chooseImage(target: typeof uploadTarget.current) {
    uploadTarget.current = target;
    uploadRef.current?.click();
  }
  async function exportFile(format: "pdf" | "png" | "project") {
    setExportMenu(false);
    setExporting(true);
    try {
      const name = (design.brand || "card")
        .replace(/[^\p{L}\p{N}_-]/gu, "-")
        .slice(0, 60);
      if (format === "project") {
        download(
          new Blob([JSON.stringify(design, null, 2)], {
            type: "application/json",
          }),
          `${name}.card.json`,
        );
        return;
      }
      const canvas = await renderCard(design, side);
      if (format === "png") {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob) download(blob, `${name}-${side}.png`);
      } else {
        const sides = await Promise.all(
          (["front", "back"] as Side[]).map((s) => renderCard(design, s)),
        );
        const pdf = makePdf(
          sides.map((c) => ({
            bytes: Uint8Array.from(
              atob(c.toDataURL("image/jpeg", 0.98).split(",")[1]!),
              (ch) => ch.charCodeAt(0),
            ),
            width: c.width,
            height: c.height,
          })),
        );
        download(
          new Blob([pdf as BlobPart], { type: "application/pdf" }),
          `${name}-front-and-back.pdf`,
        );
      }
      notify(
        format === "pdf"
          ? "Two-page, card-sized PDF downloaded."
          : `${side === "front" ? "Front" : "Back"} artwork downloaded at 300 dpi.`,
      );
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setExporting(false);
    }
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8_000_000)
        throw new Error("This design file is too large.");
      update(validateDesign(JSON.parse(await file.text())));
      notify("Design opened.");
    } catch (err) {
      notify((err as Error).message, true);
    }
  }
  async function submitPrint() {
    if (!printer || busy) return;
    if (colorConflict) {
      notify(
        "برای چاپ رنگی ریبون YMCKO یا ریبون رنگی مناسب انتخاب کنید.",
        true,
      );
      return;
    }
    setBusy(true);
    try {
      const sides: Side[] =
        printSide === "both" ? ["front", "back"] : [printSide];
      const cards = await Promise.all(sides.map((s) => renderCard(design, s)));
      const result = await api("/api/print", {
        printer: printer.name,
        copies,
        settings,
        colorMode: design.monochrome ? "black" : "color",
        images: cards.map((c) => c.toDataURL("image/jpeg", 0.98)),
        duplexConfirmed: duplex,
      });
      setJobs((previous) => [result.job, ...previous]);
      setModal(null);
      setView("queue");
      notify("Sent to the macOS print queue.");
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function openUtility() {
    try {
      await api("/api/utility", {});
      notify("HiTi Card Utility opened on your Mac.");
    } catch (err) {
      notify((err as Error).message, true);
    }
  }
  const field = (
    key:
      | "name"
      | "brand"
      | "subtitle"
      | "tagline"
      | "number"
      | "website"
      | "contact"
      | "note",
    label: string,
    placeholder = "",
    multiline = false,
  ) => (
    <label className="field" key={key}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          dir="auto"
          value={String(design[key])}
          maxLength={600}
          rows={3}
          onChange={(e) => update({ [key]: e.target.value })}
          placeholder={placeholder}
        />
      ) : (
        <input
          dir="auto"
          value={String(design[key])}
          maxLength={120}
          onChange={(e) => update({ [key]: e.target.value })}
          placeholder={placeholder}
        />
      )}
    </label>
  );
  const connectionLabel =
    refreshing && !status
      ? "Checking printer…"
      : printer
        ? printer.enabled
          ? "Printer added"
          : "Printer paused"
        : "Connection needed";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Card Studio home">
          <span className="brand-icon">
            <CreditCard size={23} />
          </span>
          <span>
            card<span className="brand-light">studio</span>
            <small>YOUR MAC. YOUR CARDS.</small>
          </span>
        </a>
        <div className="workspace-label">
          WORKSPACE <span>LOCAL</span>
        </div>
        <nav aria-label="Workspace">
          <button
            className={view === "design" ? "nav-item active" : "nav-item"}
            onClick={() => setView("design")}
          >
            <PanelTop size={18} />
            Card designer
            <ChevronRight size={14} />
          </button>
          <button
            className={view === "queue" ? "nav-item active" : "nav-item"}
            onClick={() => setView("queue")}
          >
            <Layers2 size={18} />
            Print queue<span className="count">{jobs.length}</span>
          </button>
          <button
            className={view === "printer" ? "nav-item active" : "nav-item"}
            onClick={() => setView("printer")}
          >
            <Printer size={18} />
            Your printer
          </button>
          <button
            className={view === "magnetic" ? "nav-item active" : "nav-item"}
            onClick={() => setView("magnetic")}
          >
            <CreditCard size={18} />
            تنظیم نوار مغناطیسی
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="template-label">
          START WITH A TEMPLATE <LayoutTemplate size={14} />
        </div>
        <div className="template-list">
          {templates.map((t) => (
            <button
              key={t.id}
              className={`template-item ${design.template === t.id ? "selected" : ""}`}
              onClick={() => {
                chooseTemplate(t.id);
              }}
            >
              <span className={`mini-card ${t.id}`}>
                <span>{t.badge}</span>
                <small>{t.description}</small>
                {design.template === t.id && (
                  <i>
                    <Check size={10} />
                  </i>
                )}
              </span>
              <span className="template-title">{t.name}</span>
            </button>
          ))}
        </div>
        <button className="import-link" onClick={() => chooseImage(artworkKey)}>
          <Plus size={16} />
          Use your own artwork
        </button>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={17} />
            <span>
              Private by design<small>Artwork stays on this Mac.</small>
            </span>
          </div>
          <button className="help-link" onClick={() => setModal("setup")}>
            <CircleHelp size={16} />
            Setup & printing help
            <ExternalLink size={13} />
          </button>
          <span className="version">
            CARD STUDIO <span>01 / MAC EDITION</span>
          </span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={13} />
            <strong>
              {view === "design"
                ? "Card designer"
                : view === "queue"
                  ? "Print queue"
                  : view === "magnetic"
                    ? "Magnetic stripe"
                    : "Your printer"}
            </strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection-chip ${printer?.enabled ? "connected" : ""}`}
            >
              <i />
              {connectionLabel}
            </span>
            <span className="avatar">A</span>
          </div>
        </header>
        {view === "design" ? (
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  A GOOD FIRST IMPRESSION STARTS HERE
                </div>
                <h1>
                  Make it personal<span>.</span>
                </h1>
                <p>A thoughtful card. A lasting connection.</p>
              </div>
              <div className="header-actions">
                <button
                  className="button secondary magnetic-action"
                  onClick={() => setView("magnetic")}
                  title="Magnetic stripe encoding"
                >
                  <CreditCard size={16} />
                  تنظیم نوار مغناطیسی
                </button>
                <div className="export-wrap">
                  <button
                    className="button secondary"
                    disabled={exporting}
                    aria-expanded={exportMenu}
                    onClick={() => setExportMenu(!exportMenu)}
                  >
                    <ArrowDownToLine size={16} />
                    Export
                    <ChevronDown size={14} />
                  </button>
                  {exportMenu && (
                    <>
                      <button
                        className="menu-scrim"
                        aria-label="Close export menu"
                        onClick={() => setExportMenu(false)}
                      />
                      <div className="export-menu">
                        <button onClick={() => exportFile("pdf")}>
                          <ArrowDownToLine size={15} />
                          <span>
                            Print-ready PDF
                            <small>Front + back · actual card size</small>
                          </span>
                        </button>
                        <button onClick={() => exportFile("png")}>
                          <FileImage size={15} />
                          <span>
                            Current side as PNG
                            <small>
                              {dims.width} × {dims.height} px · 300 dpi
                            </small>
                          </span>
                        </button>
                        <button onClick={() => exportFile("project")}>
                          <FolderOpen size={15} />
                          <span>
                            Save editable design
                            <small>Keep a backup or share a template</small>
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setExportMenu(false);
                            projectRef.current?.click();
                          }}
                        >
                          <Upload size={15} />
                          <span>Open a saved design</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  className="button primary"
                  onClick={() => {
                    setPrintSide(side);
                    setModal("print");
                  }}
                >
                  <Printer size={16} />
                  Print card
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="editor-layout">
              <main className="design-workspace">
                <div className="color-print-panel" dir="rtl">
                  <Palette size={22} />
                  <div>
                    <strong>چاپ رنگی کارت</strong>
                    <span>
                      {design.monochrome
                        ? "خروجی فعلی: سیاه‌وسفید"
                        : "خروجی فعلی: تمام‌رنگی"}{" "}
                      · ریبون {selectedRibbon}
                    </span>
                  </div>
                  <button className="button secondary" onClick={enableColor}>
                    تنظیم رنگی با YMCKO
                  </button>
                </div>
                <div className="layout-options">
                  <label>
                    Layout
                    <select
                      aria-label="Card layout"
                      value={design.template}
                      onChange={(e) => {
                        chooseTemplate(e.target.value as Template);
                      }}
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id === "custom"
                            ? "Blank / preprinted card"
                            : t.description}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Orientation
                    <select
                      aria-label="Card orientation"
                      value={design.orientation}
                      onChange={(e) => {
                        update(
                          customDesign(
                            design,
                            e.target.value as Design["orientation"],
                          ),
                        );
                        setSelectedElement("");
                      }}
                    >
                      <option value="landscape">Landscape</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </label>
                  <label>
                    حالت چاپ
                    <select
                      aria-label="Print color"
                      value={design.monochrome ? "black" : "color"}
                      onChange={(e) =>
                        update({ monochrome: e.target.value === "black" })
                      }
                    >
                      <option value="color">رنگی / Full color</option>
                      <option value="black">سیاه‌وسفید / Black & white</option>
                    </select>
                  </label>
                  <label>
                    ریبون نصب‌شده
                    <select
                      aria-label="Installed ribbon"
                      value={selectedRibbon}
                      onChange={(e) =>
                        setSettings((previous) => ({
                          ...previous,
                          RibbonType: e.target.value,
                        }))
                      }
                    >
                      {availableRibbons.map((value) => (
                        <option key={value} value={value}>
                          {RIBBON_LABELS[value] ?? value}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!isFree && (
                    <button
                      className="button secondary"
                      onClick={() => {
                        update(customDesign(design));
                        setTab("content");
                      }}
                    >
                      <Type size={15} />
                      Free layout
                    </button>
                  )}
                </div>
                {colorConflict && (
                  <div className="inline-note" dir="rtl">
                    خروجی رنگی انتخاب شده ولی ریبون {selectedRibbon} فقط مشکی
                    است. ریبون واقعی دستگاه را انتخاب کنید یا حالت چاپ را به
                    سیاه‌وسفید تغییر دهید.
                  </div>
                )}
                {design.template === "madar" && (
                  <div className="reference-controls">
                    <label className="safe-toggle">
                      <input
                        type="checkbox"
                        checked={showReference}
                        onChange={(e) => setShowReference(e.target.checked)}
                      />
                      <span className="switch" />
                      Show existing card
                    </label>
                    <span>Stripe & logo are guides · only new text prints</span>
                  </div>
                )}
                <div className="canvas-panel">
                  <div className="canvas-toolbar">
                    <div className="segmented side-tabs">
                      {(["front", "back"] as Side[]).map((s) => (
                        <button
                          key={s}
                          className={side === s ? "selected" : ""}
                          onClick={() => setSide(s)}
                        >
                          <CreditCard size={14} />
                          {s === "front" ? "Front" : "Back"}
                        </button>
                      ))}
                    </div>
                    <span className="canvas-label">
                      CR80 · {design.orientation.toUpperCase()}
                    </span>
                    <div className="history-controls">
                      <button
                        title="Undo"
                        aria-label="Undo"
                        disabled={!undo.length}
                        onClick={undoDesign}
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        title="Redo"
                        aria-label="Redo"
                        disabled={!redo.length}
                        onClick={redoDesign}
                      >
                        <RotateCw size={16} />
                      </button>
                    </div>
                  </div>
                  <div
                    className={`canvas-stage ${design.orientation === "portrait" ? "portrait-stage" : ""}`}
                  >
                    <div className="dimension top-dimension">
                      <span />
                      {dims.widthMm.toFixed(2)} mm
                      <span />
                    </div>
                    <div
                      className="card-preview"
                      style={{
                        width: `${zoom * (design.orientation === "portrait" ? 0.58 : 0.86)}%`,
                        aspectRatio: `${dims.width}/${dims.height}`,
                      }}
                    >
                      {previews[side] ? (
                        <img
                          draggable={false}
                          src={previews[side]}
                          alt={`${side} of ${design.brand} card design`}
                        />
                      ) : (
                        <div className="preview-loading">
                          <LoaderCircle className="spin" />
                        </div>
                      )}
                      {isFree && (
                        <LayoutOverlay
                          design={design}
                          side={side}
                          selected={selectedElement}
                          select={setSelectedElement}
                          update={update}
                        />
                      )}
                      {safeArea && (
                        <div
                          className="safe-overlay"
                          style={{
                            inset: `${(3 / dims.heightMm) * 100}% ${(3 / dims.widthMm) * 100}%`,
                          }}
                        >
                          <span>SAFE AREA</span>
                        </div>
                      )}
                    </div>
                    <div className="card-shadow" />
                    <div className="preview-caption">
                      <span className="tiny-dot" />
                      {side === "front" ? "FRONT OF CARD" : "BACK OF CARD"}
                      <span>Live preview</span>
                    </div>
                  </div>
                  <div className="canvas-footer">
                    <label className="safe-toggle">
                      <input
                        type="checkbox"
                        checked={safeArea}
                        onChange={(e) => setSafeArea(e.target.checked)}
                      />
                      <span className="switch" />
                      Show safe area
                    </label>
                    <div className="zoom-controls">
                      <button
                        aria-label="Zoom out"
                        disabled={zoom <= 60}
                        onClick={() => setZoom((z) => z - 10)}
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span>{zoom}%</span>
                      <button
                        aria-label="Zoom in"
                        disabled={zoom >= 110}
                        onClick={() => setZoom((z) => z + 10)}
                      >
                        <ZoomIn size={15} />
                      </button>
                    </div>
                    <span className="save-indicator">
                      <CheckCheck size={13} />
                      {saveState}
                    </span>
                  </div>
                </div>
                <div className="spec-strip">
                  <div>
                    <span className="spec-icon">
                      <CreditCard size={19} />
                    </span>
                    <span>
                      <small>CARD FORMAT</small>
                      <strong>CR80 standard</strong>
                    </span>
                  </div>
                  <div>
                    <span>
                      <small>DIMENSIONS</small>
                      <strong>
                        {dims.widthMm.toFixed(2)} × {dims.heightMm.toFixed(2)}{" "}
                        <em>mm</em>
                      </strong>
                    </span>
                  </div>
                  <div>
                    <span>
                      <small>PRINT QUALITY</small>
                      <strong>
                        300 <em>dpi</em>
                        <i className="quality-dot" />
                      </strong>
                    </span>
                  </div>
                  <div>
                    <span>
                      <small>LAYOUT</small>
                      <strong>
                        {design.orientation === "portrait"
                          ? "Portrait"
                          : "Landscape"}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className={`printer-banner ${printer ? "ready" : ""}`}>
                  <span className="printer-banner-icon">
                    <Printer size={23} />
                  </span>
                  <div>
                    <strong>HiTi CS-200e</strong>
                    <span>
                      {printer
                        ? `${printer.description} · ${printer.state}`
                        : status?.driverInstalled
                          ? "Driver installed. Let’s connect your printer."
                          : "Your design is ready whenever your printer is."}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (printer) setView("printer");
                      else setModal("setup");
                    }}
                  >
                    {printer ? "Printer settings" : "Connect printer"}
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="studio-note">
                  <Sparkles size={14} />
                  <span>Designed on your Mac. Made to be held.</span>
                  <span>Preview colors may differ from the printed card.</span>
                </div>
              </main>
              <aside className="inspector">
                <div className="inspector-heading">
                  <Settings2 size={17} />
                  <h2>Make it yours</h2>
                </div>
                <div className="inspector-tabs">
                  <button
                    className={tab === "content" ? "selected" : ""}
                    onClick={() => setTab("content")}
                  >
                    Content
                  </button>
                  <button
                    className={tab === "style" ? "selected" : ""}
                    onClick={() => setTab("style")}
                  >
                    Style & artwork
                  </button>
                </div>
                <div
                  className={`inspector-content ${isFree && tab === "content" ? "custom-inspector" : ""}`}
                >
                  {tab === "content" && isFree ? (
                    <>
                      {design.template === "madar" && (
                        <MadarFields
                          design={design}
                          update={update}
                          select={setSelectedElement}
                        />
                      )}
                      {design.template === "university" && (
                        <UniversityFields design={design} update={update}
                          select={(id) => { setSelectedElement(id); setSide("front"); }}
                          upload={() => chooseImage("university-photo")} />
                      )}
                      <LayoutControls
                        design={design}
                        side={side}
                        selected={selectedElement}
                        select={setSelectedElement}
                        update={update}
                        upload={() => chooseImage("element")}
                      />
                    </>
                  ) : tab === "content" ? (
                    <>
                      <div className="section-label">
                        {side === "front"
                          ? "THE INTRODUCTION"
                          : "THE OTHER SIDE"}
                        <span>{side === "front" ? "01" : "02"}</span>
                      </div>
                      {design[artworkKey] && (
                        <div className="inline-note">
                          Your uploaded artwork covers the template. Remove it
                          under Style & artwork to show these fields.
                        </div>
                      )}
                      {field("brand", "Brand / company")}
                      {side === "front" ? (
                        <>
                          {field(
                            "name",
                            design.template === "membership"
                              ? "Member name"
                              : "Full name",
                          )}
                          {field(
                            "subtitle",
                            design.template === "membership"
                              ? "Membership level"
                              : "Job title",
                          )}
                          {design.template === "membership" &&
                            field("tagline", "A few words", "", true)}
                          {field("number", "Card / member number")}
                          {design.template === "business" &&
                            field("contact", "Contact details", "", true)}
                        </>
                      ) : (
                        <>
                          {field("contact", "Contact details", "", true)}
                          {field("note", "A note on the back", "", true)}
                          {field("number", "Card / member number")}
                        </>
                      )}
                      {field("website", "Website")}
                      <div className="field-hint">
                        <span>ع</span>Persian & right-to-left text supported
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="section-label">
                        THE LOOK & FEEL<span>01</span>
                      </div>
                      {isFree && (
                        <div className="inline-note">
                          For a preprinted card, keep the paper white: white
                          areas do not add ink. Add your text and images in
                          Content.
                        </div>
                      )}
                      <label className="field">
                        <span>Typography</span>
                        <select
                          value={design.font}
                          onChange={(e) =>
                            update({ font: e.target.value as Design["font"] })
                          }
                        >
                          <option value="serif">Editorial serif</option>
                          <option value="sans">Modern sans serif</option>
                          <option value="mono">Classic monospace</option>
                        </select>
                      </label>
                      <div className="field">
                        <span>Ink color</span>
                        <div className="swatches">
                          {[
                            "#304c3d",
                            "#494558",
                            "#253e57",
                            "#803e39",
                            "#232b30",
                          ].map((color) => (
                            <button
                              key={color}
                              aria-label={`Ink ${color}`}
                              className={
                                design.accent === color ? "selected" : ""
                              }
                              style={{ background: color }}
                              onClick={() => update({ accent: color })}
                            >
                              {design.accent === color && <Check size={15} />}
                            </button>
                          ))}
                          <label
                            className="custom-color"
                            title="Custom ink color"
                          >
                            <Plus size={15} />
                            <input
                              aria-label="Custom ink color"
                              type="color"
                              value={design.accent}
                              onChange={(e) =>
                                update({ accent: e.target.value })
                              }
                            />
                          </label>
                        </div>
                      </div>
                      <label className="field">
                        <span>Paper color</span>
                        <div className="color-input">
                          <input
                            type="color"
                            value={design.paper}
                            onChange={(e) => update({ paper: e.target.value })}
                          />
                          <span>{design.paper.toUpperCase()}</span>
                        </div>
                      </label>
                      <div className="section-label spaced">
                        YOUR BRAND<span>02</span>
                      </div>
                      <button
                        className="upload-zone"
                        onClick={() => chooseImage("logo")}
                      >
                        {design.logo ? (
                          <img src={design.logo} alt="Uploaded logo" />
                        ) : (
                          <ImagePlus size={24} />
                        )}
                        <strong>
                          {design.logo ? "Replace logo" : "Add your logo"}
                        </strong>
                        <span>PNG works best · transparent background</span>
                      </button>
                      {design.logo && (
                        <button
                          className="remove-link"
                          onClick={() => update({ logo: "" })}
                        >
                          <Trash2 size={13} />
                          Remove logo
                        </button>
                      )}
                      <div className="section-label spaced">
                        FULL CARD ARTWORK<span>03</span>
                      </div>
                      <p className="inspector-description">
                        Have a finished design? Fill the {side} with your own
                        image.
                      </p>
                      <button
                        className="button secondary full"
                        onClick={() => chooseImage(artworkKey)}
                      >
                        <Upload size={15} />
                        Upload {side} artwork
                      </button>
                      <small className="upload-note">
                        PNG, JPEG or WebP · fills card edge to edge
                      </small>
                      {design[artworkKey] && (
                        <button
                          className="remove-link"
                          onClick={() => update({ [artworkKey]: "" })}
                        >
                          <Trash2 size={13} />
                          Remove {side} artwork
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="inspector-bottom">
                  <ShieldCheck size={15} />
                  <span>
                    {design.elements.some((e) => e.private)
                      ? "Layout auto-saves; entered details stay in this tab."
                      : "Auto-saved in this browser."}
                    <br />
                    Export a design file to keep a backup.
                  </span>
                </div>
              </aside>
            </div>
          </>
        ) : view === "queue" ? (
          <main className="secondary-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">FROM PIXELS TO SOMETHING REAL</div>
                <h1>
                  Print queue<span>.</span>
                </h1>
                <p>Jobs sent from this Card Studio session.</p>
              </div>
              <button className="button secondary" onClick={refreshJobs}>
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
            {jobs.length ? (
              <div className="jobs-list">
                {jobs.map((job) => (
                  <article className="job-row" key={job.id}>
                    <span className="job-icon">
                      <Printer size={24} />
                    </span>
                    <div>
                      <strong>{job.id}</strong>
                      <p>
                        {job.copies} {job.copies === 1 ? "card" : "cards"} ·{" "}
                        {job.sides === 2 ? "Front & back" : "One side"} ·{" "}
                        {new Date(job.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="job-status">{job.status}</span>
                    {(job.active || job.status === "In macOS queue") && (
                      <button
                        className="button secondary"
                        onClick={async () => {
                          try {
                            await api("/api/cancel", { id: job.id });
                            await refreshJobs();
                          } catch (err) {
                            notify((err as Error).message, true);
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span>
                  <Layers2 size={35} />
                </span>
                <h2>Your next card starts here.</h2>
                <p>
                  Review your design, choose your printer, and send your first
                  card to the queue.
                </p>
                <button
                  className="button primary"
                  onClick={() => setView("design")}
                >
                  Back to the designer
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            <p className="page-footnote">
              “No longer queued” means macOS has removed the job from its active
              queue. Check the physical card to confirm printing. History resets
              when the local server restarts.
            </p>
          </main>
        ) : view === "magnetic" ? (
          <MagneticPanel onBack={() => setView("design")} />
        ) : (
          <main className="secondary-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">MEET YOUR PRINT PARTNER</div>
                <h1>
                  Your printer<span>.</span>
                </h1>
                <p>
                  The installed HiTi driver connects your design to your cards.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={refresh}
                disabled={refreshing}
              >
                <RefreshCw className={refreshing ? "spin" : ""} size={15} />
                Check connection
              </button>
            </div>
            <div className="device-card">
              <div className="device-illustration">
                <Printer size={90} strokeWidth={1} />
                <span>HiTi</span>
              </div>
              <div className="device-info">
                <span className="eyebrow">CARD PRINTER</span>
                <h2>HiTi CS-200e</h2>
                <span
                  className={`connection-chip ${printer?.enabled ? "connected" : ""}`}
                >
                  <i />
                  {connectionLabel}
                </span>
                <div className="device-facts">
                  <div>
                    <span>macOS driver</span>
                    <strong>
                      {status
                        ? status.driverInstalled
                          ? "Installed"
                          : "Not found"
                        : "Checking…"}
                    </strong>
                  </div>
                  <div>
                    <span>Printer queue</span>
                    <strong>{printer?.description || "Not added yet"}</strong>
                  </div>
                  <div>
                    <span>Format / quality</span>
                    <strong>CR80 / 300 dpi</strong>
                  </div>
                  <div>
                    <span>Connection</span>
                    <strong>Local macOS printing</strong>
                  </div>
                </div>
                {!printer && (
                  <button
                    className="button primary"
                    onClick={() => setModal("setup")}
                  >
                    Connect printer
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
            {status?.error && <div className="inline-note">{status.error}</div>}
            <div className="device-help">
              <div>
                <h3>Printer maintenance & calibration</h3>
                <p>
                  Use the installed HiTi utility for the hardware functions it
                  supports. Card Studio handles your design and print jobs.
                </p>
              </div>
              <button
                className="button secondary"
                disabled={!status?.utilityInstalled}
                onClick={openUtility}
              >
                Open HiTi utility
                <ExternalLink size={15} />
              </button>
            </div>
            <div className="device-help">
              <div>
                <h3>Printing both sides?</h3>
                <p>
                  The CS-200e requires its optional duplex module for automatic
                  two-sided printing. Without it, print the front and back as
                  separate passes.
                </p>
              </div>
            </div>
          </main>
        )}
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          void importImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={projectRef}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => {
          void importProject(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "setup" ? (
              <>
                <div className="modal-icon">
                  <Printer size={27} />
                </div>
                <div className="eyebrow">A FEW SIMPLE STEPS</div>
                <h2 id="modal-title">Let’s get connected.</h2>
                <p>
                  Your HiTi driver is{" "}
                  {status?.driverInstalled
                    ? "installed. Add the printer to macOS to start printing."
                    : "needed before macOS can print your cards."}
                </p>
                <ol className="setup-steps">
                  <li>
                    <span>1</span>
                    <div>
                      <strong>Plug in your CS-200e</strong>
                      <p>
                        Connect the USB cable, turn it on, and load your cards
                        and ribbon.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <div>
                      <strong>Add it in macOS</strong>
                      <p>
                        Open System Settings → Printers & Scanners → Add
                        Printer, Scanner, or Fax.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <div>
                      <strong>Choose the HiTi driver</strong>
                      <p>
                        Select the CS-200e. Under “Use”, choose “Select
                        Software…” and pick “HiTi CS-200e”. Add the printer.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>4</span>
                    <div>
                      <strong>Come back and check the connection</strong>
                      <p>
                        Card Studio will find the new queue. Start with one test
                        card to check alignment and color.
                      </p>
                    </div>
                  </li>
                </ol>
                {status?.error && (
                  <div className="inline-note">{status.error}</div>
                )}
                <button
                  className="button primary full"
                  onClick={refresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={refreshing ? "spin" : ""} size={16} />
                  {refreshing ? "Checking…" : "Check connection"}
                </button>
                {printer && (
                  <div className="success-note">
                    <Check size={16} />
                    {printer.description} is added. You can print now.
                  </div>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    setModal(null);
                    setView("design");
                  }}
                >
                  Back to my design
                </button>
              </>
            ) : (
              <>
                <div className="modal-icon">
                  <Printer size={27} />
                </div>
                <div className="eyebrow">READY TO MAKE IT REAL?</div>
                <h2 id="modal-title">One last look.</h2>
                <p>
                  {design.template === "madar"
                    ? "Only the new text and artwork prints, in the selected output colors. The existing stripe and logo are not printed again. Load the back of the card for this pass."
                    : "Your card will print at actual size through the macOS HiTi driver."}
                </p>
                <div className="print-preview">
                  <img
                    src={images[printSide === "back" ? "back" : "front"]}
                    alt="Print preview"
                  />
                  <div>
                    <strong>{design.brand || "Your card"}</strong>
                    <span>
                      CR80 · {dims.widthMm.toFixed(2)} ×{" "}
                      {dims.heightMm.toFixed(2)} mm
                    </span>
                    <span>
                      300 dpi ·{" "}
                      {design.monochrome ? "Black & white" : "Full color"} ·{" "}
                      {design.orientation}
                    </span>
                  </div>
                </div>
                {printer ? (
                  <>
                    <label className="field">
                      <span>Printer</span>
                      <select
                        value={selectedPrinter}
                        onChange={(e) => setSelectedPrinter(e.target.value)}
                      >
                        {status?.printers.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.description}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="two-fields">
                      <label className="field">
                        <span>حالت چاپ</span>
                        <select
                          value={design.monochrome ? "black" : "color"}
                          onChange={(e) =>
                            update({ monochrome: e.target.value === "black" })
                          }
                        >
                          <option value="color">رنگی / Full color</option>
                          <option value="black">
                            سیاه‌وسفید / Black & white
                          </option>
                        </select>
                      </label>
                      <label className="field">
                        <span>ریبون نصب‌شده در دستگاه</span>
                        <select
                          value={
                            settings.RibbonType ??
                            printer.options.find((o) => o.key === "RibbonType")
                              ?.defaultValue ??
                            ""
                          }
                          onChange={(e) =>
                            setSettings((previous) => ({
                              ...previous,
                              RibbonType: e.target.value,
                            }))
                          }
                        >
                          {printer.options
                            .find((o) => o.key === "RibbonType")
                            ?.values.map((value) => (
                              <option key={value} value={value}>
                                {RIBBON_LABELS[value] ?? value}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    {colorConflict && (
                      <div className="inline-note" dir="rtl">
                        با ریبون K یا KO امکان چاپ رنگی وجود ندارد. نوع ریبون یا
                        حالت چاپ را اصلاح کنید.
                      </div>
                    )}
                    <p className="ribbon-hint" dir="rtl">
                      نوع ریبون باید با ریبون داخل دستگاه یکسان باشد. ریبون‌های
                      K و KO فقط مشکی چاپ می‌کنند؛ برای چاپ رنگی از ریبون رنگی
                      مانند YMCKO استفاده کنید.
                    </p>
                    <div className="two-fields">
                      <label className="field">
                        <span>Print sides</span>
                        <select
                          value={printSide}
                          onChange={(e) =>
                            setPrintSide(e.target.value as typeof printSide)
                          }
                        >
                          <option value="front">Front only</option>
                          <option value="back">Back only</option>
                          <option value="both">Front & back</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Copies</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={copies}
                          onChange={(e) => setCopies(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    {printSide === "both" && (
                      <label className="duplex-confirm">
                        <input
                          type="checkbox"
                          checked={duplex}
                          onChange={(e) => setDuplex(e.target.checked)}
                        />
                        <span>
                          My printer has the optional duplex module.
                          <small>
                            Otherwise, print each side separately and reload the
                            card following your printer’s instructions.
                          </small>
                        </span>
                      </label>
                    )}
                    <details className="driver-settings">
                      <summary>
                        HiTi driver settings
                        <Settings2 size={15} />
                      </summary>
                      {DRIVER_KEYS.filter((key) => key !== "RibbonType").map(
                        (key) => {
                          const option = printer.options.find(
                            (o) => o.key === key,
                          );
                          return (
                            option && (
                              <label key={key} className="field">
                                <span>{option.label}</span>
                                <select
                                  value={settings[key] ?? option.defaultValue}
                                  onChange={(e) =>
                                    setSettings((previous) => ({
                                      ...previous,
                                      [key]: e.target.value,
                                    }))
                                  }
                                >
                                  {option.values.map((value) => (
                                    <option key={value} value={value}>
                                      {readable[key]?.[value] ?? value}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )
                          );
                        },
                      )}
                      <p>
                        Match ribbon and thickness to the supplies loaded in
                        your printer.
                      </p>
                    </details>
                    {!printer.enabled && (
                      <div className="inline-note">
                        The printer is paused. Resume it in macOS Printers &
                        Scanners.
                      </div>
                    )}
                    <button
                      className="button primary full"
                      disabled={
                        busy ||
                        colorConflict ||
                        !printer.enabled ||
                        !Number.isInteger(copies) ||
                        copies < 1 ||
                        copies > 100 ||
                        (printSide === "both" && !duplex)
                      }
                      onClick={submitPrint}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Printer size={16} />
                      )}
                      {busy
                        ? "Sending to macOS…"
                        : `Print ${copies || 1} ${copies === 1 ? "card" : "cards"}`}
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <div className="print-connection-note">
                    <Printer size={23} />
                    <strong>Connect your HiTi first.</strong>
                    <p>
                      {status?.driverInstalled
                        ? "The driver is installed. Add your CS-200e in macOS Printers & Scanners."
                        : "Install the Mac driver and add your CS-200e in Printers & Scanners."}
                    </p>
                    <button
                      className="button primary full"
                      onClick={() => setModal("setup")}
                    >
                      Connection guide
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="text-button"
                      disabled={exporting}
                      onClick={() => exportFile("pdf")}
                    >
                      Download a print-ready PDF
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleHelp size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
