import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  activeTrackMask, EMPTY_TRACKS, exportHiTiMagnetic, exportMagneticProject,
  HITI_MAGNETIC_SAMPLES, importMagneticFile, MAX_MAGNETIC_FILE_BYTES,
  normalizeTrackInput, parseHiTiMagnetic, generateMagneticRecords, validateTracks,
} from "../src/magnetic";

const source = new URL("./fixtures/hiti-magnetic.txt", import.meta.url);

describe("random membership numbers", () => {
  test("creates unique numeric Track 2 records and round-trips through vendor TXT", () => {
    const existing = generateMagneticRecords(500, 6, "LoCo");
    const next = generateMagneticRecords(500, 6, "LoCo", existing);
    const all = [...existing, ...next];
    expect(new Set(all.map((record) => record.track2)).size).toBe(1000);
    expect(all.every((record) => /^[1-9][0-9]{5}$/.test(record.track2) && !record.track1 && !record.track3 && !validateTracks(record).length)).toBe(true);
    expect(parseHiTiMagnetic(exportHiTiMagnetic(all), "LoCo")).toEqual(all);
  });
  test("preserves long IDs as strings and enforces count, length and capacity", () => {
    const records = generateMagneticRecords(2, 37, "HiCo");
    expect(records.every((record) => /^[1-9][0-9]{36}$/.test(record.track2))).toBe(true);
    expect(importMagneticFile(exportMagneticProject(records), "LoCo")).toEqual(records);
    for (const [count, digits] of [[0, 10], [1001, 10], [1.5, 10], [1, 5], [1, 38], [1, NaN]]) {
      expect(() => generateMagneticRecords(count!, digits!, "HiCo")).toThrow();
    }
    expect(() => generateMagneticRecords(999, 10, "HiCo", records)).toThrow();
  });
});

describe("HiTi sample compatibility", () => {
  test("reproduces all seven combinations from the supplied vendor file", async () => {
    const original = await readFile(source, "utf8");
    expect(HITI_MAGNETIC_SAMPLES).toBe(original.replace(/\r\n/g, "\n").trimEnd());
    const records = parseHiTiMagnetic(original, "LoCo");
    expect(records.map(activeTrackMask)).toEqual(["1", "2", "3", "12", "23", "13", "123"]);
    expect(records.every((record) => record.coercivity === "LoCo")).toBe(true);
    expect(records[6]).toEqual({ track1: "HIJKLMN", track2: "2468024680", track3: "0987654321", coercivity: "LoCo" });
    expect(exportHiTiMagnetic(records)).toBe(original.trimEnd() + "\r\n");
  });
  test("preserves spaces in Track 1, leading zeroes, BOM and CRLF input", () => {
    const text = "\uFEFF1 MEMBER NAME\r\n\r\n123 MEMBER NAME^ID 00123 00456\r\n";
    const records = parseHiTiMagnetic(text, "HiCo");
    expect(records[0]!.track1).toBe("MEMBER NAME");
    expect(records[1]!.track1).toBe("MEMBER NAME^ID");
    expect(records[1]!.track2).toBe("00123");
    expect(records[1]!.track3).toBe("00456");
    expect(parseHiTiMagnetic(exportHiTiMagnetic(records), "HiCo")).toEqual(records);
  });
  test("rejects partial imports and reports malformed line numbers", () => {
    for (const bad of ["21 123 456", "11 ABC DEF", "4 123", "12 MEMBER", "2 ;123?", "2 ۱۲۳", "2 1 2", "1 lowercase", "3 " + "1".repeat(105)]) {
      expect(() => parseHiTiMagnetic(`2 123\n${bad}`, "HiCo")).toThrow("سطر 2:");
    }
    expect(() => parseHiTiMagnetic("\n", "HiCo")).toThrow();
    expect(() => parseHiTiMagnetic("2 1\n".repeat(1001), "HiCo")).toThrow();
    expect(() => parseHiTiMagnetic(" ".repeat(MAX_MAGNETIC_FILE_BYTES + 1), "HiCo")).toThrow();
  });
  test("TXT boundary whitespace is rejected instead of losing data", () => {
    expect(() => exportHiTiMagnetic([{ ...EMPTY_TRACKS, track1: " MEMBER " }])).toThrow("JSON");
    expect(() => exportHiTiMagnetic([EMPTY_TRACKS])).toThrow();
    expect(() => exportHiTiMagnetic([])).toThrow();
  });
});

describe("magnetic project files", () => {
  test("JSON retains per-card coercivity and whitespace", () => {
    const records = [{ ...EMPTY_TRACKS, track1: " MEMBER ", coercivity: "LoCo" as const }, { ...EMPTY_TRACKS, track2: "00123" }];
    expect(importMagneticFile(exportMagneticProject(records), "HiCo")).toEqual(records);
  });
  test("imports earlier single-card exports and detects TXT automatically", () => {
    const record = { ...EMPTY_TRACKS, track2: "00123" };
    expect(importMagneticFile(JSON.stringify({ format: "card-studio-magnetic-payload-v1", ...record }), "LoCo")).toEqual([record]);
    expect(importMagneticFile("2 00123", "LoCo")).toEqual([{ ...record, coercivity: "LoCo" }]);
  });
  test("rejects malformed types, unknown formats and invalid card data", () => {
    for (const records of [[], [null], [{ ...EMPTY_TRACKS, track2: 123 }], [{ ...EMPTY_TRACKS, track2: "123", coercivity: "other" }], [EMPTY_TRACKS], [ { ...EMPTY_TRACKS, track2: "123" }, { ...EMPTY_TRACKS, track3: ";123?" }]]) {
      expect(() => importMagneticFile(JSON.stringify({ format: "card-studio-magnetic-project-v1", records }), "HiCo")).toThrow();
    }
    expect(() => importMagneticFile('{"format":"unknown"}', "HiCo")).toThrow();
    expect(() => importMagneticFile("{", "HiCo")).toThrow();
  });
  test("maximum-size exported projects can be imported", () => {
    const records = Array.from({ length: 1000 }, () => ({ ...EMPTY_TRACKS, track1: "A".repeat(76), track2: "1".repeat(37), track3: "1".repeat(104) }));
    const exported = exportMagneticProject(records);
    expect(new TextEncoder().encode(exported).length).toBeLessThan(MAX_MAGNETIC_FILE_BYTES);
    expect(importMagneticFile(exported, "HiCo")).toEqual(records);
  });
  test("converts Persian and Arabic digits without removing separators or spaces", () => {
    expect(normalizeTrackInput("۰۱۲۳۴۵۶۷۸۹=٠١٢٣٤٥٦٧٨٩")).toBe("0123456789=0123456789");
    expect(normalizeTrackInput("MEMBER^۱۲۳ ۴")).toBe("MEMBER^123 4");
  });
});
