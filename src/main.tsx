import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App } from "@/App";
import { AuthProvider } from "@/contexts/AuthProvider";
import { applySchoolTheme } from "@/config/school";
import { baseUrl, routerMode } from "@/config/env";
import "@/styles/index.css";

applySchoolTheme();

// GitHub Pages serves static files only. `BrowserRouter` works because the
// deploy step publishes a 404.html copy of index.html, which the CDN returns
// for deep links. Set VITE_ROUTER_MODE=hash if you would rather not rely on
// that behaviour. See README for the trade-off.
const Router = routerMode === "hash" ? HashRouter : BrowserRouter;
const routerProps = routerMode === "hash" ? {} : { basename: baseUrl };

const container = document.getElementById("root");
if (!container)
  throw new Error("Root element #root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <Router {...routerProps}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
);
