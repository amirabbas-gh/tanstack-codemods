#!/usr/bin/env bash
# create-files.sh — scaffold TanStack Start config files.
#
# Writes vite.config.ts at the project root and src/router.tsx.
# Both writes are idempotent: if the file already exists it's left untouched.

set -euo pipefail

write_if_absent() {
  local path="$1"
  local content="$2"

  if [[ -e "$path" ]]; then
    echo "skip: $path (already exists)"
    return 0
  fi

  mkdir -p "$(dirname "$path")"
  printf '%s\n' "$content" > "$path"
  echo "create: $path"
}

VITE_CONFIG=$(cat <<'EOF'
import { defineConfig } from 'vite'
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
EOF
)

ROUTER_FILE=$(cat <<'EOF'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })

  return router
}
EOF
)

write_if_absent "vite.config.ts" "$VITE_CONFIG"
write_if_absent "src/router.tsx" "$ROUTER_FILE"
