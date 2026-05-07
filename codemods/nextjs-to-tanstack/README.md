# @codemod/nextjs-to-tanstack

migrate a project from the Next.js App Router to TanStack

## Installation

```bash
# Install from registry
codemod run @codemod/nextjs-to-tanstack

# Or run the workflow locally from this package (use -t for one Next.js app in a monorepo)
codemod workflow run --workflow workflow.yaml --target .
```

## Usage

This workflow migrates a **Next.js App Router** (and common **Pages Router** patterns) project to **TanStack Start** / **TanStack Router** file-routing: rewrites routes and API handlers, updates `package.json`, scaffolds `vite.config.ts` and the router entry, and writes **`TANSTACK_MIGRATION_NEXT_STEPS.md`** for remaining manual work.

## Development

```bash
# Test the transformation
npm test

# Validate the workflow
codemod workflow validate --workflow workflow.yaml

# Publish to registry
codemod login
codemod publish
```

## License

MIT
