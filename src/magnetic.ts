export type Tracks = {
  track1: string;
  track2: string;
  track3: string;
  coercivity: "HiCo" | "LoCo";
};

// ISO 7811 capacities include the start/end sentinels and LRC, which the encoder adds.
// The UI accepts payload only: up to 76 / 37 / 104 characters respectively.
export function validateTracks(tracks: Tracks): string[] {
  const errors: string[] = [];
  if (!tracks.track1 && !tracks.track2 && !tracks.track3)
    errors.push("Enter data for at least one track.");
  if (
    tracks.track1.length > 76 ||
    (tracks.track1 && !/^[\x20-\x5f]+$/.test(tracks.track1)) ||
    /[%?]/.test(tracks.track1)
  )
    errors.push(
      "Track 1: up to 76 uppercase ASCII characters, without % or ? sentinels.",
    );
  for (const [key, limit] of [
    ["track2", 37],
    ["track3", 104],
  ] as const) {
    if (
      tracks[key].length > limit ||
      (tracks[key] && !/^[0-9=]+$/.test(tracks[key]))
    )
      errors.push(
        `${key === "track2" ? "Track 2" : "Track 3"}: up to ${limit} digits and = separators, without sentinels.`,
      );
  }
  if (!["HiCo", "LoCo"].includes(tracks.coercivity))
    errors.push("Choose HiCo or LoCo to match your card.");
  return errors;
}

export const TRACK_KEYS = ["track1", "track2", "track3"] as const;
export const TRACK_LIMITS = [76, 37, 104] as const;
export const MAX_MAGNETIC_RECORDS = 1000;
export const MAX_MAGNETIC_FILE_BYTES = 1024 * 1024;
export const EMPTY_TRACKS: Tracks = {
  track1: "", track2: "", track3: "", coercivity: "HiCo",
};

// Transcribed verbatim from the supplied CS2xx/Common/Magnetic.txt (MagTest).
export const HITI_MAGNETIC_SAMPLES = `1 ABCDEFRG
2 12345678
3 2468024680
12 HIJKLMN 12345678
23 12345678 2468024680
13 HIJKLMN 2468024680
123 HIJKLMN 2468024680 0987654321`;

export function normalizeTrackInput(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)),
  );
}

export function activeTrackMask(tracks: Tracks): string {
  return TRACK_KEYS.flatMap((key, i) => tracks[key] ? [String(i + 1)] : []).join("");
}

function checkedTracks(value: unknown): Tracks {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("رکورد نوار مغناطیسی معتبر نیست.");
  const input = value as Record<string, unknown>;
  if (TRACK_KEYS.some((key) => typeof input[key] !== "string"))
    throw new Error("مقدار هر ترک باید متن باشد.");
  const tracks: Tracks = {
    track1: input.track1 as string,
    track2: input.track2 as string,
    track3: input.track3 as string,
    coercivity: input.coercivity as Tracks["coercivity"],
  };
  const errors = validateTracks(tracks);
  if (errors.length) throw new Error(errors.join("\n"));
  return tracks;
}

export function parseHiTiMagnetic(text: string, coercivity: Tracks["coercivity"]): Tracks[] {
  if (text.length > MAX_MAGNETIC_FILE_BYTES) throw new Error("فایل بیش از حد بزرگ است.");
  const rows: Tracks[] = [];
  for (const [index, line] of text.replace(/^\uFEFF/, "").split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const match = line.match(/^(1|2|3|12|13|23|123)[ \t](.+)$/);
      if (!match) throw new Error("ابتدای سطر باید شمارهٔ ترک‌ها و سپس یک فاصله باشد.");
      const mask = match[1]!;
      let payload = match[2]!;
      const tracks = { ...EMPTY_TRACKS, coercivity };
      // Numeric tracks follow Track 1. Parse from the right so spaces inside Track 1 survive.
      for (const digit of [...mask].reverse()) {
        const key = `track${digit}` as typeof TRACK_KEYS[number];
        if (digit === mask[0]) {
          tracks[key] = payload;
        } else {
          const tail = payload.match(/^(.*)[ \t]([^ \t]+)$/);
          if (!tail) throw new Error("تعداد داده‌ها با ترک‌های انتخاب‌شده تطابق ندارد.");
          tracks[key] = tail[2]!;
          payload = tail[1]!;
        }
      }
      rows.push(checkedTracks(tracks));
      if (rows.length > MAX_MAGNETIC_RECORDS) throw new Error("حداکثر ۱۰۰۰ رکورد مجاز است.");
    } catch (error) {
      throw new Error(`سطر ${index + 1}: ${(error as Error).message}`);
    }
  }
  if (!rows.length) throw new Error("فایل داده‌ای ندارد.");
  return rows;
}

export function exportHiTiMagnetic(records: Tracks[]): string {
  if (!records.length || records.length > MAX_MAGNETIC_RECORDS)
    throw new Error("بین ۱ تا ۱۰۰۰ رکورد انتخاب کنید.");
  return records.map((record, index) => {
    const tracks = checkedTracks(record);
    // MagTest's space-delimited format cannot preserve boundary whitespace reliably.
    if (tracks.track1 !== tracks.track1.trim())
      throw new Error(`رکورد ${index + 1}: فاصلهٔ ابتدا یا انتهای Track 1 را حذف کنید یا خروجی JSON بگیرید.`);
    return `${activeTrackMask(tracks)} ${TRACK_KEYS.filter((key) => tracks[key]).map((key) => tracks[key]).join(" ")}`;
  }).join("\r\n") + "\r\n";
}

export function exportMagneticProject(records: Tracks[]): string {
  if (!records.length || records.length > MAX_MAGNETIC_RECORDS)
    throw new Error("بین ۱ تا ۱۰۰۰ رکورد انتخاب کنید.");
  return JSON.stringify({
    format: "card-studio-magnetic-project-v1",
    records: records.map(checkedTracks),
    note: "Payload only; no sentinels or LRC. Export does not encode a card.",
  }, null, 2);
}

export function importMagneticFile(text: string, coercivity: Tracks["coercivity"]): Tracks[] {
  if (text.length > MAX_MAGNETIC_FILE_BYTES) throw new Error("فایل بیش از حد بزرگ است.");
  const content = text.replace(/^\uFEFF/, "");
  if (!content.trimStart().startsWith("{")) return parseHiTiMagnetic(content, coercivity);
  const data = JSON.parse(content);
  if (data?.format === "card-studio-magnetic-payload-v1") return [checkedTracks(data)];
  if (data?.format !== "card-studio-magnetic-project-v1" || !Array.isArray(data.records) ||
      !data.records.length || data.records.length > MAX_MAGNETIC_RECORDS)
    throw new Error("قالب فایل تنظیمات نوار مغناطیسی معتبر نیست.");
  return data.records.map(checkedTracks);
}
