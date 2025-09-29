# DevOps Control Center – AI coding guide

## Architecture snapshot
- Electron main process in `src/main/main.ts` boots services (`initializeServices`) before opening the window; renderer lives in `src/renderer` with React 18 + Redux Toolkit.
- Core domain logic is packaged as service classes under `src/main/services/*` (Auth, GitHub, Repository, Workflow, DatabaseManagement, ServerManagement). Each service owns persistence, external APIs, and eventing.
- Shared shapes live in `src/shared/types.ts`; keep IPC payloads in sync here so both processes compile.

## Main-process patterns
- All IPC handlers are registered in `src/main/ipc/handlers.ts` and must return the `IPCResponse` shape `{ success, data?, error? }`.
- Services are singletons: some expose `getInstance()`, `serverManagementService` exports a constructed instance that starts monitoring on import. Persisted data lands in `app.getPath('userData')` (e.g., servers.json, database-connections.db).
- New IPC channels must be whitelisted through `contextBridge` by updating `src/main/preload.ts` (both the exposed object **and** the `ElectronAPI` interface, which currently lags behind for the new server helpers).

## Renderer patterns
- Redux slices in `src/renderer/store/slices` encapsulate async work; thunks call `window.electronAPI.*` and expect `IPCResponse`. See `serversSlice` for the canonical flow from thunk → IPC → reducer.
- Views under `src/renderer/views` stick to Tailwind utility classes and pull state via `useAppSelector/useAppDispatch` from `src/renderer/hooks/redux.ts`.
- Keep derived UI state in components; persistable entities (servers, databases) round-trip through IPC rather than local mocks.

## Server & database specifics
- `ServerManagementService` (409 LOC) manages SSH connections (ssh2), stores servers in `AppData/Roaming/devops-control-center/servers.json`, and emits status/stat events. When extending server features, update the service, IPC handlers, and renderer slice together.
- `DatabaseManagementService` backs the database page with SQLite-stored connection metadata and runtime clients for MySQL/Postgres/Mongo/Redis/SQLite; interactions flow through its single instance via IPC.

## Tooling & workflows
- Dev loop: `npm run dev` (spawns Vite on :5175 and Electron via `wait-on`). There is **no** `npm start` script.
- Builds: `npm run build` (tsc main + Vite renderer) and `npm run build:electron` to package with electron-builder.
- Tests: `npm run test` (Vitest). `src/test/setup.ts` mocks `window.electronAPI`; expand those mocks whenever preload gains new methods to avoid runtime/test drift.

## When extending the app
1. Update or create the relevant service under `src/main/services`, returning `IPCResponse` payloads.
2. Register IPC channels in `src/main/ipc/handlers.ts` and expose them through `secureInvoke` in `src/main/preload.ts` (mirror in the `ElectronAPI` type + validators).
3. Reflect new contracts in `src/shared/types.ts`, Redux slices, and Vitest mocks before wiring React components.
4. Run `npm run build` or targeted tests after changes; the build catches mismatched Electron preload typings earlier than runtime.
