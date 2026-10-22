import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

import { ALWAYS, NEVER } from "./src/landing-motion-css";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      // The CSS half of src/landing-motion.ts. The site ignores the OS
      // reduced-motion setting (Saud, 2026-10-01: KOC work PCs report it, which
      // stilled every direction). Rewrites every prefers-reduced-motion feature in
      // the emitted CSS: `reduce` never matches, `no-preference` always does. The
      // viewer's turtle switch (html[data-force-reduced-motion]) is untouched.
      name: "ignore-os-reduced-motion",
      apply: "build",
      generateBundle(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== "asset" || !file.fileName.endsWith(".css")) continue;
          file.source = String(file.source)
            .replace(/\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/g, ALWAYS)
            .replace(/\(\s*prefers-reduced-motion\s*(?::\s*reduce\s*)?\)/g, NEVER);
        }
      },
    },
  ],
  resolve: { alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) }] },
  server: { port: 4188 },
});
