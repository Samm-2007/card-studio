import { describe, expect, test } from "bun:test";
import { CARD, jpegDimensions, makePdf } from "../src/pdf";
import {
  parseOptions,
  parsePrinters,
  printArguments,
  queueMessages,
} from "../src/printer";
import {
  DEFAULT_DESIGN,
  cardDimensions,
  createElement,
  customDesign,
  validateDesign,
} from "../src/design";
import { validateTracks } from "../src/magnetic";
import {
  madarDesign,
  madarFieldValue,
  updateMadarField,
  designForAutosave,
  stackedNumber,
} from "../src/madar";

const printer = {
  name: "HiTi_CS_200e",
  description: "HiTi CS-200e",
  state: "is idle",
  enabled: true,
};
const options = parseOptions(`PageSize/Media Size: *CR80Card
RibbonType/Ribbon Type: *YMCKO K HALF_YMCKO YMCKOK KO
CardType/Card Type: *0 1 2 3 4 5
CardThick/Card Thickness: 0 1 *2 3
PrintBackSide/Print back side: *0 1
PrintYMCFront/Using YMC: 0 *1
PrintKFront/Using K: *0 1 2 3
PrintYMCBack/Using YMC: 0 *1
PrintKBack/Using K: *0 1 2 3
Rotate180Front/Rotate 180: *0 1`);

describe("macOS card printing", () => {
  test("discovers only CS-200e queues, preserving paused state", () => {
    const result =
      parsePrinters(`printer Office_Laser is idle. enabled since today
 Description: Office Laser
printer HiTi_CS_200e is idle. enabled since today
 Description: HiTi CS-200e
printer Cards disabled since today
 Description: HiTi CS-200e
printer HiTi_CS_220e is idle. enabled since today
 Description: HiTi CS-220e`);
    expect(result.map((p) => [p.name, p.enabled])).toEqual([
      ["HiTi_CS_200e", true],
      ["Cards", false],
    ]);
  });
  test("sets the vendor's page size and side options explicitly", () => {
    const args = printArguments(printer, 2, 2, { CardThick: "2" }, options);
    expect(args).toContain("PageSize=CR80Card");
    expect(args).toContain("PrintFrontSide=1");
    expect(args).toContain("PrintBackSide=1");
    expect(args).toContain("CardThick=2");
    expect(args.slice(0, 4)).toEqual(["-d", "HiTi_CS_200e", "-n", "2"]);
  });
  test("rejects invalid copies, unsupported driver options and paused printers", () => {
    for (const count of [0, 101, 1.5, "2", null])
      expect(() => printArguments(printer, count, 1, {}, options)).toThrow(
        "1–100",
      );
    expect(() =>
      printArguments(printer, 1, 1, { arbitrary: "value" }, options),
    ).toThrow("not supported");
    expect(() =>
      printArguments(printer, 1, 1, { RibbonType: "$(anything)" }, options),
    ).toThrow("not supported");
    expect(() =>
      printArguments({ ...printer, enabled: false }, 1, 1, {}, options),
    ).toThrow("paused");
    expect(() => printArguments(printer, 1, 1, {}, [])).toThrow("driver");
  });
  test("rejects unsupported duplex and the PPD's adhesive-card constraint", () => {
    expect(() =>
      printArguments(
        printer,
        1,
        2,
        {},
        options.filter((o) => o.key !== "PrintBackSide"),
      ),
    ).toThrow("two-sided");
    expect(() =>
      printArguments(printer, 1, 2, { CardType: "5" }, options),
    ).toThrow("Adhesive");
    expect(() =>
      printArguments(printer, 1, 1, { CardType: "5" }, options),
    ).not.toThrow();
  });
  test("matches YMC/K settings to monochrome ribbons on both sides", () => {
    const mono = printArguments(printer, 1, 2, { RibbonType: "KO" }, options);
    for (const side of ["Front", "Back"]) {
      expect(mono).toContain(`PrintYMC${side}=0`);
      expect(mono).toContain(`PrintK${side}=1`);
    }
    const color = printArguments(printer, 1, 1, {}, options);
    expect(color).toContain("PrintYMCFront=1");
    expect(color).toContain("PrintKFront=0");
  });
  test("color jobs enable the YMC panels on both sides", () => {
    const args = printArguments(
      printer,
      1,
      2,
      { RibbonType: "YMCKO" },
      options,
      "color",
    );
    expect(args).toContain("PrintYMCFront=1");
    expect(args).toContain("PrintYMCBack=1");
    expect(args).toContain("PrintKFront=0");
    expect(args).toContain("PrintKBack=0");
  });
  test("rejects color output with black-only ribbons but allows monochrome output", () => {
    for (const ribbon of ["K", "KO"]) {
      expect(() =>
        printArguments(printer, 1, 1, { RibbonType: ribbon }, options, "color"),
      ).toThrow("YMCKO");
      expect(() =>
        printArguments(printer, 1, 1, { RibbonType: ribbon }, options, "black"),
      ).not.toThrow();
    }
    expect(() =>
      printArguments(printer, 1, 1, { RibbonType: "YMCKO" }, options, "black"),
    ).not.toThrow();
    expect(() => printArguments(printer, 1, 1, {}, options, "invalid")).toThrow(
      "output",
    );
  });
  test("shows driver failures and does not interpret empty status as an error", () => {
    const messages = queueMessages(`HiTi_CS_200e-10 user 100 today
 Status: Ribbon type mismatch!
 Alerts: job-completed-with-errors
HiTi_CS_200e-11 user 100 today
 Status: 
 Alerts: processing-to-stop-point`);
    expect(messages.get("HiTi_CS_200e-10")).toBe("Ribbon type mismatch!");
    expect(messages.has("HiTi_CS_200e-11")).toBe(false);
  });
});

describe("card PDF", () => {
  // A minimal JPEG SOF is sufficient to test dimensional validation, without hardware or a browser.
  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 2, 126, 3, 243, 3, 1, 17, 0, 2, 17, 1, 3,
    17, 1, 0xff, 0xd9,
  ]);
  const image = { bytes: jpeg, width: CARD.width, height: CARD.height };
  test("reads dimensions and rejects malformed or non-RGB JPEGs", () => {
    expect(jpegDimensions(jpeg)).toEqual({ width: 1011, height: 638 });
    expect(() => jpegDimensions(new Uint8Array([1, 2, 3]))).toThrow("JPEG");
    const cmyk = jpeg.slice();
    cmyk[11] = 4;
    expect(() => jpegDimensions(cmyk)).toThrow("RGB");
    expect(() => jpegDimensions(jpeg.slice(0, 12))).toThrow();
  });
  test("exports exactly sized landscape pages and valid byte offsets", () => {
    const pdf = makePdf([image, image]);
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text).toContain("/Count 2");
    expect(text).toContain("/MediaBox [0 0 242.64567 153.01417]");
    const xref = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(new TextDecoder().decode(pdf.slice(xref, xref + 4))).toBe("xref");
    const table = new TextDecoder().decode(pdf.slice(xref)).split("\n");
    for (let id = 1; id <= 8; id++) {
      const offset = Number(table[id + 2]!.slice(0, 10));
      expect(new TextDecoder().decode(pdf.slice(offset, offset + 7))).toBe(
        `${id} 0 obj`,
      );
    }
  });
  test("uses the vendor's portrait raster orientation for direct printing", () => {
    const text = new TextDecoder().decode(makePdf([image], true));
    expect(text).toContain("/MediaBox [0 0 154.09000 243.37000]");
    expect(text).toContain("q 0 243.37 -154.09 0 154.09 0 cm /Card Do Q");
    expect(() => makePdf([])).toThrow();
    expect(() => makePdf([image, image, image])).toThrow();
  });
  test("keeps portrait designs upright in both export and driver PDFs", () => {
    const portrait = { ...image, width: CARD.height, height: CARD.width };
    const exportText = new TextDecoder().decode(makePdf([portrait]));
    expect(exportText).toContain("/MediaBox [0 0 153.01417 242.64567]");
    const printText = new TextDecoder().decode(makePdf([portrait], true));
    expect(printText).toContain("q 154.09 0 0 243.37 0 0 cm /Card Do Q");
  });
});

test("design imports reject remote assets and preserve Persian content", () => {
  expect(validateDesign({ ...DEFAULT_DESIGN, name: "علی رضایی" }).name).toBe(
    "علی رضایی",
  );
  expect(() =>
    validateDesign({
      ...DEFAULT_DESIGN,
      frontArtwork: "https://example.com/image.jpg",
    }),
  ).toThrow("image");
  expect(() => validateDesign({ ...DEFAULT_DESIGN, accent: "red" })).toThrow(
    "color",
  );
  expect(() =>
    validateDesign({ ...DEFAULT_DESIGN, name: "x".repeat(601) }),
  ).toThrow("long");
});

test("custom layouts preserve orientation, positions and old saved designs", () => {
  const old: Record<string, unknown> = { ...DEFAULT_DESIGN };
  delete old.orientation;
  delete old.elements;
  delete old.monochrome;
  expect(validateDesign(old).orientation).toBe("landscape");
  const portrait = customDesign(DEFAULT_DESIGN, "portrait");
  expect(cardDimensions(portrait.orientation).width).toBe(638);
  expect(validateDesign(portrait).elements).toHaveLength(4);
  expect(customDesign(portrait, "landscape", true).elements).toHaveLength(0);
  const element = createElement("front", { text: "۱۲۳۴۵", x: 12.5 });
  expect(
    validateDesign({ ...portrait, elements: [element] }).elements[0]!.x,
  ).toBe(12.5);
  expect(() =>
    validateDesign({ ...portrait, elements: [{ ...element, width: -1 }] }),
  ).toThrow();
  expect(() =>
    validateDesign({ ...portrait, elements: [element, element] }),
  ).toThrow();
});

test("magnetic payload validation enforces track lengths, charset and coercivity", () => {
  const base = {
    track1: "",
    track2: "128001",
    track3: "",
    coercivity: "HiCo" as const,
  };
  expect(validateTracks(base)).toEqual([]);
  expect(validateTracks({ ...base, track2: "۱۲۳۴" })).toHaveLength(1);
  expect(validateTracks({ ...base, track2: ";123?" })).toHaveLength(1);
  expect(validateTracks({ ...base, track2: "1".repeat(38) })).toHaveLength(1);
  expect(validateTracks({ ...base, track1: "MEMBER^128001" })).toEqual([]);
  expect(validateTracks({ ...base, track1: "%MEMBER?" })).toHaveLength(1);
  expect(validateTracks({ ...base, track1: "lowercase" })).toHaveLength(1);
  expect(validateTracks({ ...base, track2: "" })).toHaveLength(1);
});

test("Madar preset prints text on the back without a stripe or logo layer", () => {
  const design = madarDesign(DEFAULT_DESIGN);
  expect(design.orientation).toBe("portrait");
  expect(design.monochrome).toBe(false);
  expect(validateDesign(design).template).toBe("madar");
  expect(design.frontArtwork).toBe("");
  expect(design.backArtwork).toBe("");
  expect(
    design.elements.every((e) => e.side === "back" && e.kind === "text"),
  ).toBe(true);
  expect(
    design.elements.every((e) => e.x >= 20.4 && e.y + e.height <= 72),
  ).toBe(true);
  expect(
    design.elements.filter((e) => e.private).every((e) => e.text === ""),
  ).toBe(true);
});

test("new designs default to color and Madar preserves explicitly selected monochrome output", () => {
  expect(DEFAULT_DESIGN.monochrome).toBe(false);
  expect(madarDesign({ ...DEFAULT_DESIGN, monochrome: true }).monochrome).toBe(
    true,
  );
});

test("Madar numbers stack as four Persian groups without reversing digits", () => {
  expect(stackedNumber("1234 5678 9012 3456")).toBe("۱۲۳۴\n۵۶۷۸\n۹۰۱۲\n۳۴۵۶");
  expect(stackedNumber("۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶")).toBe("۱۲۳۴\n۵۶۷۸\n۹۰۱۲\n۳۴۵۶");
  let design = madarDesign(DEFAULT_DESIGN);
  design = {
    ...design,
    elements: updateMadarField(design, "number", "1234567890123456"),
  };
  expect(madarFieldValue(design, "number")).toBe("1234567890123456");
});

test("layout autosave removes card data, including duplicates and orientation changes", () => {
  let design = madarDesign(DEFAULT_DESIGN);
  design = { ...design, elements: updateMadarField(design, "cvv2", "123") };
  const original = design.elements.find((e) => e.id === "madar-cvv2")!;
  design.elements.push({ ...original, id: "duplicate-card-field" });
  const saved = designForAutosave(design);
  expect(
    saved.elements.filter((e) => e.private).every((e) => e.text === ""),
  ).toBe(true);
  expect(design.elements.find((e) => e.id === "madar-cvv2")!.text).toBe("123");
  const landscape = customDesign(design, "landscape");
  expect(
    designForAutosave(landscape)
      .elements.filter((e) => e.private)
      .every((e) => e.text === ""),
  ).toBe(true);
  expect(saved.elements.find((e) => e.id === "madar-label-cvv2")!.text).toBe(
    "cvv2",
  );
});
