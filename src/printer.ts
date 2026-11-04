export type Printer = {
  name: string;
  description: string;
  state: string;
  enabled: boolean;
};
export type DriverOption = {
  key: string;
  label: string;
  values: string[];
  defaultValue: string;
};
export const DRIVER_KEYS = [
  "RibbonType",
  "CardType",
  "CardThick",
  "ColorPreference",
  "Rotate180Front",
  "Rotate180Back",
] as const;
export const RIBBON_LABELS: Record<string, string> = {
  YMCKO: "YMCKO — تمام‌رنگی + پوشش محافظ",
  YMCKOK: "YMCKOK — رنگی / مشکی پشت + پوشش",
  HALF_YMCKO: "½ YMCKO — رنگی نیم‌پنل",
  K: "K — فقط مشکی",
  KO: "KO — مشکی + پوشش محافظ",
};
export const isMonochromeRibbon = (ribbon: string) =>
  ribbon === "K" || ribbon === "KO";

export function parsePrinters(output: string): Printer[] {
  const result: Printer[] = [];
  for (const block of output.split(/(?=^printer )/m)) {
    const match = block.match(/^printer ([\w.-]+) (.+)/);
    if (!match) continue;
    const description =
      block.match(/^\s*Description: (.+)$/m)?.[1]?.trim() ?? match[1]!;
    // Never fall back to the default office printer.
    if (!/cs[ _-]?200e/i.test(`${match[1]} ${description}`)) continue;
    result.push({
      name: match[1]!,
      description,
      state: match[2]!.split(/\.\s/)[0]!,
      enabled: !/disabled/.test(match[2]!),
    });
  }
  return result;
}

export function parseOptions(output: string): DriverOption[] {
  return output.split("\n").flatMap((line) => {
    const match = line.match(/^([\w]+)\/([^:]+): (.*)$/);
    if (!match) return [];
    const rawValues = match[3]!.split(/\s+/).filter(Boolean);
    return [
      {
        key: match[1]!,
        label: match[2]!,
        values: rawValues.map((v) => v.replace(/^\*/, "")),
        defaultValue:
          rawValues.find((v) => v.startsWith("*"))?.slice(1) ??
          rawValues[0] ??
          "",
      },
    ];
  });
}

export function queueMessages(output: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const block of output.split(/(?=^[\w.-]+-\d+\s)/m)) {
    const id = block.match(/^([\w.-]+-\d+)\s/)?.[1];
    const message = block.match(/^[ \t]*Status:[ \t]*([^\n\r]*)/m)?.[1]?.trim();
    if (id && message) result.set(id, message);
  }
  return result;
}

export function printArguments(
  printer: Printer,
  copies: unknown,
  sides: number,
  settings: unknown,
  options: DriverOption[],
  colorMode?: unknown,
): string[] {
  if (!printer.enabled)
    throw new Error(
      "This printer is paused. Resume it in macOS Printers & Scanners.",
    );
  if (!Number.isInteger(copies) || Number(copies) < 1 || Number(copies) > 100)
    throw new Error("Choose 1–100 copies.");
  const supports = (key: string, value: string) =>
    options.some((o) => o.key === key && o.values.includes(value));
  if (!supports("PageSize", "CR80Card"))
    throw new Error(
      "Select the HiTi CS-200e driver for this printer in macOS.",
    );
  if (sides !== 1 && sides !== 2)
    throw new Error("Choose one or two card sides.");
  if (sides === 2 && !supports("PrintBackSide", "1"))
    throw new Error("This queue does not expose two-sided card printing.");
  if (typeof settings !== "object" || !settings || Array.isArray(settings))
    throw new Error("Invalid driver settings.");
  const selected = settings as Record<string, unknown>;
  const ribbon =
    selected.RibbonType ??
    options.find((o) => o.key === "RibbonType")?.defaultValue;
  const card =
    selected.CardType ??
    options.find((o) => o.key === "CardType")?.defaultValue;
  if (colorMode !== undefined && colorMode !== "color" && colorMode !== "black")
    throw new Error("Choose full color or black & white output.");
  if (
    colorMode === "color" &&
    typeof ribbon === "string" &&
    isMonochromeRibbon(ribbon)
  )
    throw new Error(
      "چاپ رنگی به ریبون رنگی مثل YMCKO نیاز دارد؛ ریبون K یا KO فقط مشکی چاپ می‌کند.",
    );
  if (sides === 2 && card === "5")
    throw new Error("Adhesive cards cannot use two-sided printing.");
  const args = [
    "-d",
    printer.name,
    "-n",
    String(copies),
    "-t",
    "Card Studio",
    "-o",
    "PageSize=CR80Card",
    "-o",
    "print-scaling=none",
    "-o",
    "PrintFrontSide=1",
    "-o",
    `PrintBackSide=${sides === 2 ? "1" : "0"}`,
  ];
  for (const [key, value] of Object.entries(selected)) {
    if (
      !DRIVER_KEYS.includes(key as (typeof DRIVER_KEYS)[number]) ||
      typeof value !== "string" ||
      !supports(key, value)
    )
      throw new Error("A driver setting is not supported by this printer.");
    args.push("-o", `${key}=${value}`);
  }
  // Respect the vendor PPD's YMC/K constraints for monochrome ribbons.
  for (const side of sides === 2 ? ["Front", "Back"] : ["Front"]) {
    const mono = ribbon === "K" || ribbon === "KO";
    for (const [key, value] of [
      [`PrintYMC${side}`, mono ? "0" : "1"],
      [`PrintK${side}`, mono ? "1" : "0"],
    ]) {
      if (supports(key!, value!)) args.push("-o", `${key}=${value}`);
    }
  }
  return args;
}
