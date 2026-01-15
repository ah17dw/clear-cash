import { createRoot } from "react-dom/client";
import { toast } from "sonner";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA service worker registration - only in production builds
if (import.meta.env.PROD) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        toast("Update available", {
          description: "A new version is ready. Reload to update.",
          action: {
            label: "Reload",
            onClick: () => updateSW(true),
          },
          duration: Infinity,
        });
      },
    });
  });
}

