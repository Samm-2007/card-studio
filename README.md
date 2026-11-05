# Card Studio for HiTi CS-200e

A local Mac website for designing CR80 cards and printing through the installed HiTi CUPS driver.
It is a standalone application with its own dependencies and configuration; no database or cloud service is required.

From the project folder:

```sh
bun install
bun run start
```

You can also double-click **Start Card Studio.command** in this folder.

Open **http://localhost:3217**. Keep the terminal running. To choose another port, set
`CARD_STUDIO_PORT` when starting the app. The server binds only to `127.0.0.1`.

## Design and print

For the supplied Madar card, open **http://localhost:3217/?layout=madar** or choose **Your Madar
card**. This portrait preset opens on the back and provides Persian holder-name, four stacked
number groups, expiry and CVV2 fields. The existing stripe and logos are display-only guides;
PNG/PDF exports and printing contain only the new text/artwork in the selected output colors. Toggle **Show existing card** off to see
the actual print artwork. Entered values are excluded from layout autosave, including duplicated
personal text layers; they clear on reload. Deliberately exporting an editable design file includes
its current entered values. Print one card to check alignment against the physical stock.

- Choose a membership/business template or **Blank / preprinted card**.
- For a custom layout, add text, images and shapes in Content. Select an element on the card
  or in the layer list. Drag to move it, or use millimeter coordinates, sizing, rotation,
  typography, color and alignment controls. Arrow keys move a selected element by 0.5 mm;
  Shift + arrow moves it by 2 mm. Up to 80 elements across both sides are supported.
- Choose **Portrait** or **Landscape** above the preview. Switching a preset to portrait opens
  a custom layout; Undo returns to the preset. Elements can be edited independently on each side.
- Choose **Black & white** for monochrome artwork. With a preprinted card, use a white paper
  background so only the text/artwork adds ink. Uploaded full-card artwork is printed too.
- The ribbon setting must match the ribbon physically installed. New designs start in **Full color**
  and the printer uses its driver default (normally **YMCKO**). Use the **تنظیم رنگی با YMCKO**
  button or choose output mode and installed ribbon above the preview. Preferences from the
  earlier black-only setup migrate to the color-capable defaults once; later ribbon choices are
  remembered per printer. Color output is blocked with K/KO ribbons. Black & white output remains
  available with black or color ribbons. Changing templates no longer forces the K ribbon.
- Print one side at a time unless the optional duplex module is fitted. “Back only” sends the
  back artwork as one normal print pass: reload the card in the correct orientation first.
- Start with one card to check placement, card feed orientation, color and safe areas.

The actual print command uses the installed driver's CR80 page size, ribbon/card options and
YMC/K constraints. Landscape artwork is rotated into the vendor's portrait page geometry;
portrait artwork remains upright. Printing does not use the browser's A4/Letter print dialog.
The preview and exported artwork are 1011 × 638 pixels (landscape) or 638 × 1011 (portrait),
approximately 300 dpi. The HiTi PPD's raster media size is 154.09 × 243.37 points.

## Jundi-Shapur university card

Choose **کارت دانشجویی جندی‌شاپور** or open
**http://localhost:3217/?layout=university**. The landscape CR80 preset recreates both sides
of the supplied card: the front artwork is perspective-corrected and retouched to remove the
original portrait and personal text; the back geometry is rebuilt with separate editable text.
The reference photographs themselves are not included in the repository.

Enter student number, full name, father name, faculty, degree and expiry in the Persian fields.
Use **انتخاب عکس پرسنلی** to replace the portrait in its existing frame without stretching it.
Zoom and horizontal/vertical sliders adjust its crop. Use Back and the layer controls to edit
university contact text. All personal fields and the portrait remain editable layers with
millimeter positioning. PNG, PDF and printing include the fixed artwork and new details.
This preset is intended for blank card stock, rather than text-only overprinting.

Layout autosave excludes personal text and portrait data, including duplicated private layers.
Download an editable design JSON from Export to deliberately retain the entered details and
photo. The built-in background identifier is retained when converting to a free layout, and is
cleared when choosing a different preset.

## Save and export

The current design auto-saves in this browser's local storage. Export an editable `.card.json`
file to back it up or open it in another browser. Export also offers the current side as PNG
and a two-page PDF with exact 85.60 × 53.98 mm (or portrait) pages. The PDF embeds rasterized
artwork so Persian shaping, fonts and uploaded images match the preview. Guides never print.

Changing browser, clearing site data, or moving between `localhost` and `127.0.0.1` uses a
different design store. Export a backup first. Large image designs can exceed browser storage;
the save indicator reports this, and downloading a design file remains available.

## Printer setup and troubleshooting

Add the USB printer in macOS **System Settings → Printers & Scanners**. Choose **HiTi CS-200e**
under **Use → Select Software**. Card Studio selects only CS-200e queues, never the Mac's default
office printer. “Printer added” reports that a CUPS queue exists; it does not promise that a
disconnected printer is online.

“Ribbon type mismatch” means the job's Ribbon Type does not match the installed ribbon. Set
**Ribbon loaded in printer** in the print dialog to the actual supply (K, KO, YMCKO, etc.).
The job list includes messages returned by the driver. Submission to CUPS does not prove the
physical card printed; check the resulting card. “No longer queued” only describes the CUPS
queue. Job history covers this local server session and resets when the server restarts.

The Your Printer page can open the installed HiTi utility for its supported maintenance
functions. Card Studio does not change system printer defaults, calibrate the device itself,
or invent ribbon/card remaining counts.

## Magnetic stripe

The Magnetic Stripe page configures ISO 7811 payloads for Tracks 1, 2 and 3 and
HiCo/LoCo per card. Open **تنظیم نوار مغناطیسی** from the navigation, or go to
**http://localhost:3217/?layout=madar&view=magnetic**.

- Load the seven original examples with **۷ نمونهٔ HiTi**. They come from the supplied
  `CardDesireeCS_v1.0.47.24/CS-200e_Driver_v2.5.9.27_FW_v1.31.0.p/CS-200e_Driver_v2.5.9.27/CS2xx/Common/Magnetic.txt`.
- Edit each card separately, add or remove records, and leave unused tracks empty.
  Persian/Arabic digits typed into fields become ASCII digits. Enter payloads without
  start/end sentinels or LRC. All records must be valid before export.
- Import the original `Magnetic.txt` or a saved Card Studio JSON file (up to 1 MiB and
  1,000 cards). Importing or loading samples replaces the current list only after every
  record validates; errors identify the invalid TXT line. Earlier single-payload v1 JSON
  exports are also supported.
- Export **Magnetic.txt** to reproduce the supplied MagTest data-file structure, with CRLF
  line endings: active track numbers, a space, then track payloads in ascending order.
  For example, `12 HIJKLMN 12345678` provides Track 1 and Track 2. Track 1 may include
  internal spaces; leading/trailing spaces require JSON export instead. The TXT format
  does **not** store coercivity: choose HiCo/LoCo in the encoder tool too. TXT imports and
  samples inherit the currently selected coercivity, because the file does not specify it.
- Export **JSON** to retain every card's track data and HiCo/LoCo choice for re-import.
  Data stays in page memory until explicitly downloaded and clears when leaving the page
  or reloading. Exports contain the entered data in plain text.

**Physical reading/writing is still unavailable on this Mac.** Inspection of the supplied
Windows `CS2xx/Tool/MagTest.exe` reveals `SCWOpen`, `SCWSetT123BPI`,
`SCWWriteTrack1/2/3/12/23/123`, `SCWReadTrack1/2/3/12/23/123`, and `SCWAnalyzeRW`,
with a reference to `SCW_HITI.dll`. Function names establish that there is a separate
encoder interface; they do not establish its ABI, command bytes or a macOS implementation.
The supplied `دستگاه کارتخوان.exe` is a Windows .NET payment-terminal application
(AvaniPortal with PC POS dependencies), not a documented CS-200e encoder SDK.

The installed macOS PPD exposes magnetic card media but no track-writing options. Choosing
that media does not encode anything. Use the vendor's Windows encoder tool with its required
runtime/encoder dependencies, or obtain a supported macOS SDK to integrate physical operations.
The app labels direct encoding as unavailable and never treats payload export as a written card.
No firmware changes, raw USB commands, or card-writing operations were performed while
implementing this feature.

The small original track-data sample is included as `tests/fixtures/hiti-magnetic.txt`.
Vendor installer packages and executables are local reference materials and are excluded from Git.

## Development and verification

The app uses React, lucide and Bun; no separate database or cloud
service is required. Frontend changes rebuild automatically; reload the page to see them.

```sh
bun test
bun run typecheck
```

Unit tests cover printer/option parsing, monochrome ribbon constraints, copy limits, layout
imports, portrait/landscape PDF sizes and byte offsets, and magnetic payload validation.
Server guards allow only local Host/Origin headers and require a per-process token for printing,
canceling a session's print jobs, or opening the utility. Print PDFs use private temporary files
and are removed after CUPS accepts them. Submitted cards may remain in macOS's own print spool.
