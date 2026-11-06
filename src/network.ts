import { networkInterfaces } from "node:os";

export function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 || (parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

export function lanAddresses(): string[] {
  return [...new Set(Object.values(networkInterfaces()).flatMap((entries) =>
    (entries ?? []).filter((entry) => entry.family === "IPv4" && !entry.internal && isPrivateIPv4(entry.address))
      .map((entry) => entry.address)))];
}

export function isLoopback(address: string): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

export function allowedRequest(req: Request, hosts: string[]): boolean {
  if (!hosts.includes(req.headers.get("host") ?? "")) return false;
  const origin = req.headers.get("origin");
  return !origin || hosts.some((host) => origin === `http://${host}`);
}

export function validLogin(header: string | null, password: string): boolean {
  return header === `Basic ${Buffer.from(`cardstudio:${password}`).toString("base64")}`;
}
