import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Ensure the Home Screen app (PWA) picks up new deployments.
// When an update is available, show a prompt to reload into the new version.
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

