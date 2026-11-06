import { describe, expect, test } from "bun:test";
import { allowedRequest, isLoopback, isPrivateIPv4, validLogin } from "../src/network";
import { elementId } from "../src/id";

describe("LAN access guards", () => {
  const hosts = ["localhost:3217", "172.20.17.75:3217"];
  const request = (host: string, origin?: string) => new Request(`http://${host}/api/status`, {
    headers: { host, ...(origin ? { origin } : {}) },
  });
  test("accepts explicit local addresses and matching origins only", () => {
    expect(allowedRequest(request(hosts[1]!, `http://${hosts[1]}`), hosts)).toBe(true);
    expect(allowedRequest(request("evil.example:3217"), hosts)).toBe(false);
    expect(allowedRequest(request(hosts[1]!, "http://evil.example"), hosts)).toBe(false);
    expect(allowedRequest(request(hosts[1]!, "null"), hosts)).toBe(false);
  });
  test("limits remote peers to private networks", () => {
    for (const address of ["10.0.0.5", "172.16.0.1", "172.31.255.254", "192.168.1.10"]) expect(isPrivateIPv4(address)).toBe(true);
    for (const address of ["172.15.0.1", "172.32.0.1", "8.8.8.8", "192.168.1.999", "", "::1"]) expect(isPrivateIPv4(address)).toBe(false);
    expect(isLoopback("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopback("192.168.1.10")).toBe(false);
  });
  test("requires correct credentials before granting remote access", () => {
    const auth = (login: string) => `Basic ${Buffer.from(login).toString("base64")}`;
    expect(validLogin(null, "secret")).toBe(false);
    expect(validLogin(auth("cardstudio:wrong"), "secret")).toBe(false);
    expect(validLogin(auth("other:secret"), "secret")).toBe(false);
    expect(validLogin(auth("cardstudio:secret"), "secret")).toBe(true);
  });
});

test("element IDs work without the secure-context randomUUID API", () => {
  const descriptor = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
  try {
    const ids = Array.from({ length: 100 }, elementId);
    expect(new Set(ids).size).toBe(100);
    expect(ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
  } finally {
    if (descriptor) Object.defineProperty(crypto, "randomUUID", descriptor);
    else Reflect.deleteProperty(crypto, "randomUUID");
  }
});
