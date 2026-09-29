import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
vi.stubGlobal(
  "BroadcastChannel",
  class {
    addEventListener() {}
    postMessage() {}
    close() {}
  },
);
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
