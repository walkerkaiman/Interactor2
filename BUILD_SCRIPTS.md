# Interactor2 Build & Start Scripts

This document explains the different scripts available for building and starting the Interactor2 system.

## Available Scripts

### 1. `start.bat` - Production Build & Start
**Use this for:**
- Production deployments
- Ensuring all TypeScript code is compiled
- Testing the complete build process
- When you want to verify everything builds correctly

**What it does:**
1. Checks Node.js installation
2. Installs dependencies for all components (shared, backend, frontend)
3. **Builds all components in order:**
   - Shared package (TypeScript compilation)
   - Backend (TypeScript compilation + asset copying)
   - Frontend (TypeScript compilation + Vite build)
4. Starts both servers
5. Opens the web interface

**Build Order:**
```
shared → backend → frontend
```

### 2. `start-dev.bat` - Development Start
**Use this for:**
- Daily development work
- Faster startup times
- When you're actively developing and don't need builds
- Quick testing of changes

**What it does:**
1. Checks Node.js installation
2. Installs dependencies for all components
3. **Starts servers directly** (no building)
4. Opens the web interface

## Build Scripts in Package.json Files

### Shared Package (`shared/package.json`)
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

### Backend (`backend/package.json`)
```json
{
  "scripts": {
    "build": "tsc && npm run copy-assets",
    "copy-assets": "copyfiles -u 1 \"src/**/*.json\" dist && copyfiles -u 1 \"src/**/*.ts\" dist",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "start": "npm run dev"
  }
}
```

### Frontend (`frontend/package.json`)
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```

## When to Use Each Script

### Use `start.bat` when:
- ✅ Deploying to production
- ✅ Testing the complete build pipeline
- ✅ Verifying all TypeScript compiles correctly
- ✅ Ensuring all assets are properly copied
- ✅ Want to test the production build

### Use `start-dev.bat` when:
- ✅ Daily development work
- ✅ Making frequent code changes
- ✅ Want faster startup times
- ✅ Don't need to verify builds
- ✅ Just want to test functionality quickly

## Error Handling

Both scripts include comprehensive error handling:
- Node.js version checking
- Dependency installation verification
- Build failure detection
- Clear error messages with pause for reading

## Manual Build Commands

If you need to build components manually:

```bash
# Build shared package
cd shared && npm run build

# Build backend
cd backend && npm run build

# Build frontend
cd frontend && npm run build
```

## Development Workflow

1. **For daily development:** Use `start-dev.bat`
2. **Before committing:** Use `start.bat` to verify builds work
3. **For production:** Always use `start.bat`

## Notes

- The build process ensures all TypeScript code is properly compiled
- Asset files (JSON, TS) are copied to the backend dist folder
- The frontend build creates optimized production assets
- Both scripts automatically open the web interface in your default browser 