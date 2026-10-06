interface LocalRequest {
  host?: string;
  remoteAddress?: string;
  encrypted: boolean;
  path?: string;
}

// Safari versions that reject Secure cookies on HTTP localhost cannot retain
// the AWS CSRF/refresh cookies. Adapt only these cookies on loopback HTTP;
// keep production, HTTPS, non-loopback requests and other cookies untouched.
export function localSessionCookies(
  cookies: string[],
  request: LocalRequest,
): string[] {
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(
    request.host ?? "",
  );
  const localClient = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
    request.remoteAddress ?? "",
  );
  if (
    request.encrypted ||
    !localHost ||
    !localClient ||
    !request.path?.startsWith("/api/v1/auth/")
  )
    return cookies;
  return cookies.map((cookie) => {
    const name = cookie.slice(0, cookie.indexOf("="));
    if (name !== "XSRF-TOKEN" && name !== "ems_refresh") return cookie;
    return cookie
      .split(";")
      .filter((attribute) => attribute.trim().toLowerCase() !== "secure")
      .join(";");
  });
}
