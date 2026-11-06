import { CARD, jpegDimensions } from "./pdf";
import { normalizeTrackInput } from "./magnetic";

export const MAGNETIC_PREFIX = "~2";
export const MAGNETIC_SUFFIX = "|";
export function magneticNumber(value: string): string {
  const number = normalizeTrackInput(value).replace(/\s/g, "");
  if (!/^[0-9]{1,37}$/.test(number)) throw new Error("شمارهٔ مغناطیسی باید ۱ تا ۳۷ رقم باشد؛ فقط رقم و فاصله مجاز است.");
  return number;
}

type Agent = { id: string; machine: string; printer: string; lastSeen: number };
type Job = {
  id: string; agentId: string; createdAt: number;
  status: "waiting" | "claimed" | "submitted" | "failed";
  message: string; image?: string; track2?: string; fingerprint: string;
};

// Volatile, one-card queue. Claim exactly once; never retry an ambiguous native print.
export class WindowsBridge {
  readonly key = crypto.randomUUID();
  private agent: Agent | null = null;
  private jobs: Job[] = [];
  private expire(now: number) {
    for (const job of this.jobs) if (job.status === "waiting" && now - job.createdAt > 60_000) {
      job.status = "failed"; job.message = "رابط ویندوز درخواست را تا ۶۰ ثانیه دریافت نکرد؛ ارسال نشد.";
      delete job.image; delete job.track2;
    }
  }
  status(now = Date.now()) {
    this.expire(now);
    return {
      connected: !!this.agent && now - this.agent.lastSeen < 15_000,
      machine: this.agent?.machine ?? "", printer: this.agent?.printer ?? "",
      job: this.jobs[0] ? this.publicJob(this.jobs[0]) : null,
    };
  }
  private publicJob(job: Job) {
    return { id: job.id, status: job.status, message: job.message, createdAt: job.createdAt };
  }
  poll(value: unknown, now = Date.now()) {
    if (!value || typeof value !== "object") throw new Error("Invalid connector identity.");
    const input = value as Record<string, unknown>;
    if (typeof input.id !== "string" || !/^[\w-]{1,80}$/.test(input.id) ||
      typeof input.machine !== "string" || input.machine.length > 100 ||
      typeof input.printer !== "string" || input.printer.length > 200 || !/cs[ _-]?200e/i.test(input.printer))
      throw new Error("Select a HiTi CS-200e Windows printer.");
    if (this.agent && this.agent.id !== input.id &&
      (now - this.agent.lastSeen < 15_000 || this.jobs.some((job) => job.status === "claimed")))
      throw new Error("Another Windows connector is already paired. Stop it first.");
    this.agent = { id: input.id, machine: input.machine, printer: input.printer, lastSeen: now };
    this.expire(now);
    const job = this.jobs.find((item) => item.status === "waiting" && item.agentId === input.id);
    if (!job) return { job: null };
    job.status = "claimed";
    job.message = "دریافت در ویندوز؛ منتظر تأیید اپراتور / درایور. دوباره ارسال نکنید.";
    const payload = { id: job.id, image: job.image!, track2: job.track2! };
    delete job.image; delete job.track2;
    return { job: payload };
  }
  submit(value: unknown, now = Date.now()) {
    if (!value || typeof value !== "object") throw new Error("Invalid Windows print job.");
    const input = value as Record<string, unknown>;
    if (typeof input.id !== "string" || !/^[\w-]{1,80}$/.test(input.id) ||
      typeof input.track2 !== "string" || typeof input.image !== "string") throw new Error("Invalid Windows print job.");
    const track2 = magneticNumber(input.track2);
    const fingerprint = new Bun.CryptoHasher("sha256").update(this.key + track2 + input.image).digest("hex");
    const previous = this.jobs.find((job) => job.id === input.id);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new Error("Request ID already belongs to a different card.");
      return this.publicJob(previous);
    }
    const status = this.status(now);
    if (!status.connected || !this.agent) throw new Error("رابط ویندوز متصل نیست؛ ابتدا CardStudio-Connector.ps1 را روی ویندوز اجرا کنید.");
    if (this.jobs.some((job) => job.status === "waiting" || job.status === "claimed"))
      throw new Error("یک کارت در حال پردازش است؛ نتیجهٔ آن را در ویندوز مشخص کنید.");
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input.image) || input.image.length > 4_000_000)
      throw new Error("Invalid card image.");
    const dimensions = jpegDimensions(new Uint8Array(Buffer.from(input.image.split(",")[1]!, "base64")));
    if (!((dimensions.width === CARD.width && dimensions.height === CARD.height) ||
      (dimensions.width === CARD.height && dimensions.height === CARD.width))) throw new Error("Invalid CR80 artwork size.");
    const job: Job = {
      id: input.id, agentId: this.agent.id, createdAt: now, status: "waiting",
      message: "منتظر دریافت توسط رابط ویندوز", image: input.image, track2, fingerprint,
    };
    this.jobs.unshift(job); this.jobs.splice(50);
    return this.publicJob(job);
  }
  result(value: unknown) {
    if (!value || typeof value !== "object") throw new Error("Invalid connector result.");
    const input = value as Record<string, unknown>;
    const job = this.jobs.find((item) => item.id === input.jobId);
    if (!job || job.agentId !== input.id || (job.status !== "claimed" && job.status !== "submitted" && job.status !== "failed"))
      throw new Error("Unknown or unclaimed print job.");
    if (typeof input.ok !== "boolean" || typeof input.message !== "string" || input.message.length > 500)
      throw new Error("Invalid connector result.");
    if (job.status === "claimed") {
      job.status = input.ok ? "submitted" : "failed";
      job.message = input.ok
        ? "به درایور ویندوز ارسال شد؛ نوشتن مغناطیسی فقط با بازخوانی کارت تأیید می‌شود."
        : input.message;
    }
    return { ok: true };
  }
}
