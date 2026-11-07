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
`CARD_STUDIO_PORT` when starting the app. By default the server binds only to `127.0.0.1`.

## Connect from Windows on your local network

On the Mac, stop an existing server with Control-C, then run:

```sh
bun run start:lan
```

The terminal lists the Mac's private IPv4 addresses. On Windows, connect to the same local
network and open the listed `http://<Mac-IP>:3217/?layout=madar` address in a browser.
Sign in with username **cardstudio** and the password in `.scratch/lan-password.txt` on the Mac.
The password is generated on first LAN launch, reused across restarts, and excluded from Git.
Connections from the Mac itself do not need this login. Use this HTTP mode only on a trusted
local network; HTTP does not encrypt credentials or card data. Do not forward the port on your router.
Allow incoming connections for Bun if macOS Firewall prompts. Guest Wi-Fi/client isolation can
prevent computers from reaching each other. The address may change when the Mac changes networks.

Keep the Mac and server running. To return to Mac-only access, stop the server and use `bun run start`.
Remote requests must authenticate before accessing the app or API; Host/Origin checks and the
per-process token for printer actions remain enabled.

Choose **همین کامپیوتر — چاپگر USB ویندوز / مرورگر** in the Print card dialog to print on the
computer running the browser. Windows browsers select this route by default. This opens the
local browser print dialog with one CR80 artwork page, without submitting a job to the Mac.
Choose the installed Windows HiTi printer, CR80 paper, 100%/actual size, zero margins and no
headers/footers. Set copies, installed ribbon and card type in the Windows printer properties.
Print front and back separately and reload the card. A browser cannot confirm physical printing
or read the Windows queue; check the Windows queue and the card itself. Allow pop-ups for this
site if the print window is blocked. The print window has a button to reopen the print dialog.

Choose **مک میزبان سایت — صف macOS** to use the printer attached to the **Mac**.
Opening the maintenance utility opens it on the Mac. The Windows browser
cannot directly access a Windows USB encoder through this server. Designs are saved separately
in each browser; use `.card.json` export/import to move a design between them.

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
- Generate random membership numbers for Track 2: choose 1–1,000 new records and 6–37
  digits (defaults: 10 records, 10 digits). New records are appended, existing populated
  records are preserved, and duplicates within the current list are excluded. Each new
  record inherits the selected record's HiCo/LoCo. Export to retain the list; these IDs
  are not automatically inserted into the printed back artwork or written to a stripe.
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
Server guards allow only explicitly recognized local/LAN Host and Origin headers and require a per-process token for printing,
canceling a session's print jobs, or opening the utility. Print PDFs use private temporary files
and are removed after CUPS accepts them. Submitted cards may remain in macOS's own print spool.

### Windows magnetic connector (requires hardware verification)

In the print dialog select **ویندوز — چاپ پشت کارت + نوشتن مغناطیسی** and download `CardStudio-Connector.ps1` on Windows. Keep this file private: it contains the LAN login and an ephemeral bridge key. Run the PowerShell command shown in the site, select HiTi CS-200e and configure CR80, single-sided printing and the installed ribbon in Properties. Enable **Encoding by text data**, set prefix filter `~`, suffix filter `|`, and remove any fixed manual magnetic data (for example `12345678`). The native GDI text command is `~2<entered-number>|`; the `2` selects Track 2. This requires a driver supporting text extraction and the optional magnetic encoder. A raster browser print alone cannot encode.

The connector polls the authenticated site, receives one back image and the exact entered numeric card field (Persian/Arabic digits normalized, spaces removed, leading zeroes preserved), asks the Windows operator to confirm, and submits one copy through PrintDocument/native TextOut. No runtime or SDK download is needed on Windows PowerShell 5.1. The server never automatically retries a claimed card; if the connector crashes, check the Windows queue and resolve the physical card before restarting the site. Download a new connector after server restart or host address change. Choose the proper HiCo/LoCo setting in the driver. Driver submission is not proof of successful encoding: verify the card with a magnetic reader. Native Windows execution and physical encoding have not been tested on the development Mac.

Reference for text extraction syntax: [HiTi driver manual, Magnetic encoding setting](https://update.hiti.com/Files/Manual/CS-222e_EN_UserManual.pdf). Actual availability depends on the installed CS-200e driver version.

### One-time Windows startup setup

Download **نصب خودکار ویندوز (یک‌بار)** from the print dialog, extract the ZIP, close old connectors, and double-click `Install.cmd`. Setup copies the connector into `%LOCALAPPDATA%\CardStudio` and adds a per-user Startup shortcut; no administrator privileges are needed. It starts minimized on Windows sign-in, remembers the selected printer, and reconnects while the site is available. It still asks the operator to confirm each card. The Mac host must keep the server running at the configured address.

Save the correct CR80, ribbon, single-sided and magnetic filter settings in the printer's Windows Printing Preferences. Subsequent launches load these driver defaults; temporary changes in the first print dialog are not persisted by this setup. Delete `%LOCALAPPDATA%\CardStudio\printer.txt` with the connector closed to select another printer. Run `%LOCALAPPDATA%\CardStudio\Uninstall.cmd` to remove automatic startup; close the connector window to stop the running session. Installer updates require closing the connector and running the new installer. The installed script contains LAN credentials; keep it private. The pairing key is now stored in ignored `.scratch/windows-bridge-key.txt` with restricted file permissions and survives server restarts. Windows installer/autostart behavior still requires verification on Windows.
