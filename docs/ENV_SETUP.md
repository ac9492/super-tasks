# Environment Configuration Setup

This project uses a hybrid approach for environment configuration:

- **Base configuration** (production/stage flags) are in static TypeScript files
- **Per-developer values** (such as client IDs for optional integrations) are loaded from `.env` files and converted to TypeScript constants

## Overview

### Static Environment Files

- `src/environments/environment.ts` - Development configuration
- `src/environments/environment.prod.ts` - Production configuration
- `src/environments/environment.stage.ts` - Staging configuration

These files contain base configuration like `production`, `stage`, and `version` flags.

### Dynamic Environment Variables

- `.env` - Environment variables for all environments
- `src/app/config/env.generated.ts` - Auto-generated TypeScript constants (gitignored)

The `.env` file contains environment-specific values that should not be committed to version control. Everything in it is compiled into the client bundle, so it must contain only values that may be public.

## Setup Instructions

1. **Create your .env file**

   ```bash
   cp .env.example .env
   ```

2. **Add your environment variables**

   ```bash
   # .env
   ONEDRIVE_CLIENT_ID=your-client-id
   ```

3. **Access environment variables in your code**

   ```typescript
   // Import from the generated constants (type-safe!)
   import { ENV } from './app/config/env.generated';

   // Direct access
   const clientId = ENV.ONEDRIVE_CLIENT_ID;

   // Or using utility functions (with type safety)
   import { getEnv, getEnvOptional } from './app/util/env';

   const clientId = getEnv('ONEDRIVE_CLIENT_ID');
   // For keys that may be missing from .env, with a fallback
   const optionalValue = getEnvOptional('SOME_OPTIONAL_KEY') ?? 'default';
   ```

## Running the Application

The npm scripts automatically generate TypeScript constants from `.env` before running:

```bash
# Development
npm run startFrontend

# Production configuration
npm run startFrontend:prod

# Staging configuration
npm run startFrontend:stage
```

Note: All commands use the same `.env` file. The difference between environments is controlled by the Angular configuration (production/stage flags).

## Build Commands

Build commands also generate constants before building. A bare `ng serve` or `ng build` does not; run `npm run env` first:

```bash
# Production build
npm run buildFrontend:prod:es6

# Staging build
npm run buildFrontend:stage:es6
```

## How It Works

1. **load-env.js** reads the `.env` file and generates `src/app/config/env.generated.ts`
2. **TypeScript constants** are imported and used throughout the app (no process.env needed!)
3. **Type safety** - The utility functions use `keyof typeof ENV` for autocomplete and type checking
4. **Gitignored** - The generated file is never committed

## Security Notes

- Never commit `.env` files to version control
- The generated `env.generated.ts` is gitignored automatically
- Values are compiled into the client bundle at build time, where anyone using the built app can read them. Never put private secrets (passwords, private API keys, server credentials) in `.env`; use only client IDs and keys that are designed to be public
- Only add non-sensitive values to `.env.example`

## Adding New Environment Variables

1. Add to `.env`:

   ```bash
   NEW_API_KEY=your-api-key-here
   ```

2. Regenerate the TypeScript constants with `npm run env` (`npm run startFrontend` and the `buildFrontend:*` scripts do this automatically)

3. Use in your code with full type safety:

   ```typescript
   import { ENV } from './app/config/env.generated';
   const apiKey = ENV.NEW_API_KEY;

   // Or with utility function
   import { getEnv } from './app/util/env';
   const apiKey = getEnv('NEW_API_KEY'); // TypeScript knows all available keys!
   ```

## Benefits of This Approach

- ✅ **Type Safety**: Full TypeScript support with autocomplete
- ✅ **No Runtime Dependencies**: Constants are compiled into the bundle
- ✅ **Works Everywhere**: No need for process.env or special webpack config
- ✅ **Simple**: Just import and use the constants
- ✅ **Out of version control**: Per-developer values stay in `.env`, not in the repository (they are still public in built bundles)
