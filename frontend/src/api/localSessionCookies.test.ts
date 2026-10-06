import { expect, it } from "vitest";
import { localSessionCookies } from "../../scripts/local-session-cookies";

const cookies = [
  "XSRF-TOKEN=test; Path=/; Secure; HttpOnly; SameSite=Lax",
  "ems_refresh=test; Path=/api/v1/auth; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax",
];
const local = { host: "localhost:5173", remoteAddress: "::1", encrypted: false, path: "/api/v1/auth/csrf" };

it("makes only localhost HTTP session cookies usable while retaining HttpOnly, SameSite, path and lifetime", () => {
  expect(localSessionCookies(cookies, local)).toEqual([
    "XSRF-TOKEN=test; Path=/; HttpOnly; SameSite=Lax",
    "ems_refresh=test; Path=/api/v1/auth; Max-Age=2592000; HttpOnly; SameSite=Lax",
  ]);
  expect(cookies[0]).toContain("Secure");
});
it.each([
  { encrypted: true },
  { host: "ems.example.com" },
  { host: "localhost.attacker.example:5173" },
  { host: "192.168.1.2:5173" },
  { remoteAddress: "192.168.1.2" },
  { path: "/api/employees" },
])("preserves Secure cookies outside the loopback HTTP auth proxy: %j", override => {
  expect(localSessionCookies(cookies, { ...local, ...override })).toBe(cookies);
});
it.each(["127.0.0.1:5173", "[::1]:5173"])("supports loopback host %s", host => {
  expect(localSessionCookies(cookies, { ...local, host })[0]).not.toContain("; Secure");
});
it("preserves unrelated cookies including __Host cookies", () => {
  const other = ["__Host-session=test; Path=/; Secure; HttpOnly", "other=test; Secure"];
  expect(localSessionCookies(other, local)).toEqual(other);
});
