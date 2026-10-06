import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import { TLSSocket } from "node:tls";
import { localSessionCookies } from "./scripts/local-session-cookies.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "EMS_");
  const gateway = new URL(
    process.env.EMS_GATEWAY_URL ??
      env.EMS_GATEWAY_URL ??
      "https://d2z6z22jatofwt.cloudfront.net",
  );
  const proxy = {
    "/api": {
      target: gateway.origin,
      changeOrigin: true,
      // AWS services allow the gateway's HTTPS origin. Keep browser requests
      // same-origin through Vite so CSRF and refresh cookies still work.
      headers: gateway.protocol === "https:" ? { Origin: gateway.origin } : {},
      configure(proxy) {
        proxy.on("proxyRes", (response, request) => {
          const cookies = response.headers["set-cookie"];
          if (cookies) response.headers["set-cookie"] = localSessionCookies(cookies, {
            host: request.headers.host,
            remoteAddress: request.socket.remoteAddress,
            encrypted: request.socket instanceof TLSSocket && request.socket.encrypted,
            path: request.url,
          });
        });
      },
    } satisfies ProxyOptions,
  };

  return {
    plugins: [react()],
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: {
      host: "localhost",
      proxy,
    },
  };
});
