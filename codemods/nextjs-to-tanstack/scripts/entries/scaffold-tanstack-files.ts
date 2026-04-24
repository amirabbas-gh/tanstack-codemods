/**
 * Replacement for the scaffold-tanstack-files shell node.
 *
 * Triggers off `package.json` (which always exists in a Next app) and, from
 * inside the transform, writes `vite.config.ts` and `src/router.tsx` using
 * the sandboxed `fs` module — but only when the files don't already exist,
 * so the step is idempotent.
 *
 * The package.json content itself is not modified here (R11 handles that);
 * the transform returns `null`.
 */

import type { Codemod } from "codemod:ast-grep";
import type JSON_TYPES from "codemod:ast-grep/langs/json";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { getFilename } from "../utils/paths.ts";

const VITE_CONFIG = `import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: 'src',
      router: {
        routesDirectory: 'app',
      },
    }),
    viteReact(),
    nitro(),
  ],
})
`;

const ROUTER_FILE = `import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })

  return router
}
`;

const codemod: Codemod<JSON_TYPES> = async (root) => {
  const file = getFilename(root);
  if (!file.endsWith("/package.json") && !file.endsWith("package.json")) {
    return null;
  }

  const repoRoot = dirname(file);
  writeIfAbsent(join(repoRoot, "vite.config.ts"), VITE_CONFIG);
  writeIfAbsent(join(repoRoot, "src", "router.tsx"), ROUTER_FILE);
  return null;
};

export default codemod;

function writeIfAbsent(path: string, content: string): void {
  try {
    readFileSync(path);
    return; // Already exists.
  } catch {
    // Continue to write.
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
