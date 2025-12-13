# Shinobi Cash Website

Official website for Shinobi Cash - A privacy-focused cross-chain withdrawal application built on Privacy Pools that enables anonymous transfers using zero-knowledge proofs and Open Intent Framework.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Monorepo Structure

- `apps/web` - Main website application
- `packages/ui` - Shared UI components
- `packages/typescript-config` - Shared TypeScript configuration
- `packages/eslint-config` - Shared ESLint configuration

## Development

This is a Turborepo monorepo using pnpm workspaces.

### Adding UI Components

```bash
pnpm dlx shadcn@latest add <component-name> -c apps/web
```

### Using Components

```tsx
import { Button } from "@workspace/ui/components/button"
```

## License

MIT
