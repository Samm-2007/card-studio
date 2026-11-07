import { mkdtemp, readFile, rm, writeFile, access, mkdir, chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { watch } from "node:fs";
import { CARD, jpegDimensions, makePdf } from "./src/pdf";
import { allowedRequest, isLoopback, isPrivateIPv4, lanAddresses, validLogin } from "./src/network";
import {
  DRIVER_KEYS,
  parseOptions,
  parsePrinters,
  printArguments,
  queueMessages,
} from "./src/printer";

import { WindowsBridge } from "./src/windowsBridge";
const root = dirname(import.meta.path);
const port = Number(process.env.CARD_STUDIO_PORT || 3217);
const token = crypto.randomUUID();
const lanEnabled = process.argv.includes("--lan") || process.env.CARD_STUDIO_LAN === "1";
const passwordPath = join(root, ".scratch", "lan-password.txt");
let lanPassword = "";
if (lanEnabled) {
  await mkdir(dirname(passwordPath), { recursive: true, mode: 0o700 });
  try {
    lanPassword = (await readFile(passwordPath, "utf8")).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (!lanPassword) {
    lanPassword = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
    await writeFile(passwordPath, `${lanPassword}\n`, { mode: 0o600 });
  }
  await chmod(passwordPath, 0o600);
}
// Persist the pairing credential independently of the volatile print queue.
const bridgeKeyPath = join(root, ".scratch", "windows-bridge-key.txt");
await mkdir(dirname(bridgeKeyPath), { recursive: true, mode: 0o700 });
try { await writeFile(bridgeKeyPath, crypto.randomUUID(), { mode: 0o600, flag: "wx" }); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
await chmod(bridgeKeyPath, 0o600);
const bridgeKey = (await readFile(bridgeKeyPath, "utf8")).trim();
if (!/^[0-9a-f-]{36}$/.test(bridgeKey)) throw new Error("Invalid saved Windows connector key.");
const bridge = new WindowsBridge(bridgeKey);
const buildDir = await mkdtemp(join(tmpdir(), "card-studio-web-"));
async function buildClient() {
  const built = await Bun.build({
    entrypoints: [join(root, "src/main.tsx")],
    outdir: buildDir,
    minify: false,
    target: "browser",
    naming: "[name].[ext]",
  });
  if (!built.success)
    throw new Error(built.logs.map((log) => log.message).join("\n"));
}
await buildClient();
let rebuildTimer: ReturnType<typeof setTimeout>;
const sourceWatcher = watch(join(root, "src"), { recursive: true }, () => {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    void buildClient().catch(console.error);
  }, 100);
});
const html = await readFile(join(root, "index.html"), "utf8");
const driverPath =
  "/Library/Printers/PPDs/Contents/Resources/HiTi CS-200e.ppd.gz";
const utilityPath = "/Library/Printers/HiTi/Utility/CardUtilityCS2xx.app";
const exists = async (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );
type Job = {
  id: string;
  copies: number;
  sides: number;
  createdAt: string;
  status: string;
};
const jobs: Job[] = [];
let submitting = false;

async function command(
  binary: string,
  args: string[],
  timeoutMs = 10000,
): Promise<string> {
  const proc = Bun.spawn([binary, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, LC_ALL: "C", LANG: "C" },
  });
  const timeout = setTimeout(() => proc.kill(), timeoutMs);
  try {
    const [stdout, stderr, exit] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exit !== 0)
      throw new Error(
        stderr.trim() ||
          "macOS printing is unavailable. Check Printers & Scanners.",
      );
    return stdout;
  } finally {
    clearTimeout(timeout);
  }
}
async function printers() {
  return parsePrinters(await command("/usr/bin/lpstat", ["-l", "-p"]));
}
async function capabilities(name: string) {
  const keys: readonly string[] = [
    ...DRIVER_KEYS,
    "PageSize",
    "PrintBackSide",
    "PrintYMCFront",
    "PrintYMCBack",
    "PrintKFront",
    "PrintKBack",
  ];
  return parseOptions(
    await command("/usr/bin/lpoptions", ["-p", name, "-l"]),
  ).filter((o) => keys.includes(o.key));
}
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

const server = Bun.serve({
  hostname: lanEnabled ? "0.0.0.0" : "127.0.0.1",
  port,
  maxRequestBodySize: 12 * 1024 * 1024,
  async fetch(req, server) {
    const url = new URL(req.url);
    const allowedHosts = ["127.0.0.1", "localhost", ...(lanEnabled ? lanAddresses() : [])].map((host) => `${host}:${port}`);
    if (!allowedRequest(req, allowedHosts))
      return json({ error: "This request is not from Card Studio." }, 403);
    const peer = server.requestIP(req)?.address ?? "";
    if (lanEnabled && !isLoopback(peer)) {
      if (!isPrivateIPv4(peer.replace(/^::ffff:/, "")))
        return json({ error: "Only local network connections are allowed." }, 403);
      if (!validLogin(req.headers.get("authorization"), lanPassword))
        return new Response("Sign in to Card Studio.", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="Card Studio", charset="UTF-8"', "Cache-Control": "no-store" },
        });
    }
    try {
      if (req.method === "GET") {
        if (url.pathname === "/")
          return new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
              "Content-Security-Policy":
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
              "Referrer-Policy": "no-referrer",
              "X-Content-Type-Options": "nosniff",
            },
          });
        if (url.pathname === "/main.js" || url.pathname === "/main.css")
          return new Response(Bun.file(join(buildDir, url.pathname.slice(1))));
        if (
          url.pathname === "/reference/madar-front.png" ||
          url.pathname === "/reference/madar-back.png" ||
          url.pathname === "/reference/university-front.png" ||
          url.pathname === "/reference/university-back.png"
        )
          return new Response(
            Bun.file(
              join(root, "assets", url.pathname.slice("/reference/".length)),
            ),
            {
              headers: {
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
              },
            },
          );
        if (url.pathname === "/api/windows/status") return json(bridge.status());
        if (url.pathname === "/api/windows/download" || url.pathname === "/api/windows/setup") {
          const script = (await readFile(join(root, "windows/connector.ps1"), "utf8")).replace("__CONFIG__", JSON.stringify({url: url.origin, key: bridge.key, password: lanPassword}).replaceAll("'", "''"));

          if (url.pathname === "/api/windows/setup") {
            const directory = await mkdtemp(join(tmpdir(), "card-studio-setup-"));
            try {
              await writeFile(join(directory, "CardStudio-Connector.ps1"), "\ufeff" + script);
              for (const name of ["Install.cmd", "install.ps1", "Uninstall.cmd"])
                await writeFile(join(directory, name), await readFile(join(root, "windows", name)));
              const zip = Bun.spawn(["/usr/bin/zip", "-q", "setup.zip", "CardStudio-Connector.ps1", "Install.cmd", "install.ps1", "Uninstall.cmd"], {cwd: directory, stdout:"ignore", stderr:"pipe"});
              if (await zip.exited !== 0) throw new Error("Could not create Windows setup package.");
              return new Response(await readFile(join(directory,"setup.zip")), {headers:{"Content-Type":"application/zip","Content-Disposition":'attachment; filename="CardStudio-Windows-Setup.zip"',"Cache-Control":"no-store"}});
            } finally { await rm(directory, {recursive:true, force:true}); }
          }

          return new Response("\ufeff" + script, { headers: {"Content-Type":"application/octet-stream", "Content-Disposition":'attachment; filename="CardStudio-Connector.ps1"', "Cache-Control":"no-store"} });
        }
        if (url.pathname === "/api/status") {
          const [driverInstalled, utilityInstalled] = await Promise.all([
            exists(driverPath),
            exists(utilityPath),
          ]);
          let printerList: Awaited<ReturnType<typeof printers>> = [];
          let error: string | null = null;
          try {
            printerList = await printers();
          } catch (err) {
            error = (err as Error).message;
          }
          const queues = await Promise.all(
            printerList.map(async (printer) => ({
              ...printer,
              options: await capabilities(printer.name).catch(() => []),
            })),
          );
          const defaultPrinter = await command("/usr/bin/lpstat", ["-d"])
            .then((output) => output.match(/system default destination:\s*(\S+)/)?.[1] ?? null)
            .catch(() => null);
          return json({
            token,
            driverInstalled,
            utilityInstalled,
            printers: queues,
            defaultPrinter,
            error,
          });
        }
        if (url.pathname === "/api/jobs") {
          if (!jobs.length) return json({ jobs });
          const [active, details] = await Promise.all([
            command("/usr/bin/lpstat", ["-W", "not-completed", "-o"]),
            command("/usr/bin/lpstat", ["-W", "all", "-l", "-o"]),
          ]);
          const activeIds = new Set(
            active.split("\n").map((line) => line.split(/\s+/)[0]),
          );
          const messages = queueMessages(details);
          return json({
            jobs: jobs.map((job) => ({
              ...job,
              message: messages.get(job.id) ?? "",
              active: activeIds.has(job.id) && job.status !== "Canceled",
              status:
                job.status === "Canceled"
                  ? job.status
                  : messages.has(job.id)
                    ? messages.get(job.id)!
                    : activeIds.has(job.id)
                      ? "In macOS queue"
                      : "No longer queued",
            })),
          });
        }
      }
      if (req.method === "POST") {
        if (url.pathname === "/api/windows/poll" || url.pathname === "/api/windows/result") {
          if (req.headers.get("x-windows-bridge-key") !== bridge.key) return json({error:"Download a fresh connector from Card Studio."},403);
          const body = await req.json();
          return json(url.pathname.endsWith("/poll") ? bridge.poll(body) : bridge.result(body));
        }
        if (req.headers.get("x-card-studio-token") !== token)
          return json(
            { error: "Reload Card Studio to reconnect to your Mac." },
            403,
          );
        if (url.pathname === "/api/windows/print") return json(bridge.submit(await req.json()));
        if (url.pathname === "/api/utility") {
          if (!(await exists(utilityPath)))
            return json(
              { error: "The HiTi utility is not installed on this Mac." },
              404,
            );
          await command("/usr/bin/open", [utilityPath]);
          return json({ ok: true });
        }
        if (url.pathname === "/api/cancel") {
          const body = (await req.json()) as { id?: unknown };
          const job = jobs.find((job) => job.id === body.id);
          if (!job)
            return json(
              {
                error:
                  "This print job was not submitted from this Card Studio session.",
              },
              404,
            );
          await command("/usr/bin/cancel", [job.id]);
          job.status = "Canceled";
          return json({ ok: true });
        }
        if (url.pathname === "/api/print") {
          if (submitting)
            return json(
              { error: "A card is being submitted. Please wait." },
              409,
            );
          submitting = true;
          let directory: string | undefined;
          try {
            const body = (await req.json()) as {
              printer?: unknown;
              copies?: unknown;
              images?: unknown;
              settings?: unknown;
              duplexConfirmed?: unknown;
              colorMode?: unknown;
            };
            const printer = (await printers()).find(
              (p) => p.name === body.printer,
            );
            if (!printer)
              return json(
                {
                  error:
                    "Add your HiTi CS-200e in macOS Printers & Scanners first.",
                },
                400,
              );
            if (
              !Array.isArray(body.images) ||
              body.images.length < 1 ||
              body.images.length > 2
            )
              throw new Error("Choose one or two card sides.");
            if (body.images.length === 2 && body.duplexConfirmed !== true)
              throw new Error(
                "Confirm that your printer has the optional duplex module.",
              );
            const options = await capabilities(printer.name);
            const args = printArguments(
              printer,
              body.copies,
              body.images.length,
              body.settings,
              options,
              body.colorMode,
            );
            const images = body.images.map((data: unknown) => {
              if (
                typeof data !== "string" ||
                !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data) ||
                data.length > 4_000_000
              )
                throw new Error("Invalid card image.");
              const bytes = new Uint8Array(
                Buffer.from(data.split(",")[1]!, "base64"),
              );
              const dimensions = jpegDimensions(bytes);
              if (!(
                (dimensions.width === CARD.width &&
                  dimensions.height === CARD.height) ||
                (dimensions.width === CARD.height &&
                  dimensions.height === CARD.width)
              ))
                throw new Error(
                  "Card artwork must be 1011 × 638 or 638 × 1011 pixels.",
                );
              return { bytes, ...dimensions };
            });
            directory = await mkdtemp(join(tmpdir(), "card-studio-print-"));
            const path = join(directory, "card.pdf");
            await writeFile(path, makePdf(images, true), { mode: 0o600 });
            const output = await command("/usr/bin/lp", [...args, path], 20000);
            const id = output.match(/request id is ([\w.-]+-\d+)/)?.[1];
            if (!id)
              throw new Error(
                "macOS accepted the command but did not return a job ID. Check the print queue before trying again.",
              );
            const job = {
              id,
              copies: Number(body.copies),
              sides: images.length,
              createdAt: new Date().toISOString(),
              status: "In macOS queue",
            };
            jobs.unshift(job);
            jobs.splice(50);
            return json({ job });
          } finally {
            submitting = false;
            if (directory)
              await rm(directory, { recursive: true, force: true });
          }
        }
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "Something went wrong." },
        400,
      );
    }
  },
});
console.log(`Card Studio is ready at http://localhost:${server.port}`);
if (lanEnabled) {
  for (const address of lanAddresses()) console.log(`Windows / LAN: http://${address}:${server.port}/?layout=madar`);
  console.log(`LAN username: cardstudio · Password file: ${passwordPath}`);
}
const cleanup = async () => {
  sourceWatcher.close();
  server.stop();
  await rm(buildDir, { recursive: true, force: true });
  process.exit(0);
};
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
