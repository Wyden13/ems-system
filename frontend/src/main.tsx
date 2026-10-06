import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppearanceProvider from "./components/layout/AppearanceProvider";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppearanceProvider>
      <App />
    </AppearanceProvider>
  </StrictMode>,
);
