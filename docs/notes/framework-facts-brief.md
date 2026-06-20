# Sublime UI — Authoritative Facts Brief (for docs writers)

Use ONLY these APIs. Do not invent signatures, methods, or options not listed here.

## Packages
- `@sublime-ui/framework` — model-centric data layer over Redux Toolkit + a fetch Gateway.
- `@sublime-ui/library` — tokens-first design system (cross-platform components).
- `@sublime-ui/ui` — navigation ("storybooks") + layout primitives.
- `@sublime-ui/desktop` — Electron shell + a typed native bridge.
- `@sublime-ui/devkit` — the `sublime` CLI.

## Model (framework)
```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class User extends Model {
  protected static resource = '/users';
  declare id: number;
  declare name: string;
  declare role: 'admin' | 'member';
}
registerModel(User);
```
- Async commands (throw a typed `DataError` on real failure; absence is `null`, not an error): `User.all()`, `User.find(id)`, `user.save()`, `user.delete()`, `User.call(...)` for custom endpoints (HTTP-backed models only).
- Reactive React hooks (cache-first; fetch + cache if missing): `User.rxAll()`, `User.rxFind(id)`.
- `registerModel(Model)` wires an **in-memory** Gateway by default (the Redux slice is the source of truth — zero config). `registerModel(Model, HttpGateway)` uses REST; `registerModel(Model, DbGateway)` uses a local document DB. All three auto-register a Redux slice + a discovery registry; casting keeps plain JSON in the store (`hydrate`/`toPlain`).
- Gateway = a pluggable storage **strategy** (`index/show/create/update/destroy`) returning raw rows and throwing a typed `DataError` (`HttpError`, `NetworkError`, `AuthError`, `NotFoundError`, `ConfigError`, `StorageError`; `ValidationError` reserved). `ApiResponse<T> = { success, message, data, errors }` is **HTTP-internal** — the REST gateway unwraps it; it is not part of the Model data contract.
- Fields are declared with `declare` (set once, then queried); custom getters/derived values are normal class methods/getters.

## Library
- Tokens-first: a serializable `SublimeTokens` object → `generateThemes(tokens, mode)` → `{ paperTheme (MD3, mobile), muiTheme (web) }`.
- Wrap the app in `<SublimeProvider tokens={tokens}>`; read tokens with `useTokens()`.
- Components resolve per platform by filename: `X.tsx` (web/MUI), `X.native.tsx` (mobile/Paper), shared `X.types.ts`. The bundler picks the file.
- Unified notifications: `useNotify()` — the same call shows a snackbar on mobile and a toast on web. A `NotificationHost` per platform.
- ~21 components including `AppBar`, `GlassAppBar`; `BottomNav` and `Drawer` are mobile-only. Glass aesthetic.

## Navigation (@sublime-ui/ui) — "storybook"
```ts
// src/navigation/storybook.native.ts  (mobile)
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/mobile/Home';
import { ProductDetail } from '../screens/mobile/ProductDetail';
import { settingsBook } from './settings.native';

export default book({
  format: 'bottomNav',            // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    home: page(Home, { title: 'Home', icon: 'home' }),
    product: page<{ id: number }>(ProductDetail, { title: 'Product' }),
    settings: link(settingsBook, { title: 'Settings', icon: 'cog' }),
  },
});
```
- Web formats: `'sidebar' | 'stack' | 'tabs'`. Books are authored SEPARATELY per platform (`storybook.native.ts`, `storybook.web.ts`). A mobile book cannot use a web format (type error) and vice versa.
- `page<Params>(ScreenComponent, opts?)` — `Params` makes `turnTo` typed. `link(book, opts?)` nests a book. `PageOptions`: `{ title?, icon?, path?, initial? }`.
- Compile step: `sublime build:nav` → generates `navigation.native.tsx` (React Navigation), `navigation.web.tsx` (react-router), `routes.d.ts` (typed route map), and an `index` barrel exporting the platform-resolved `<Navigation/>`.
- Runtime hook: `const nav = useNav();` → `nav.turnTo('product', { id: 1 })` (params required iff the page declared them), `nav.turnBack()`, `nav.current()`, `nav.params<T>()`. `turnTo` is type-checked against the generated route map — an unknown name or wrong/missing params is a type error.
- Layout primitives (platform-resolved): `Screen`, `Stack`, `Row`, `Spacer`.

## Desktop (@sublime-ui/desktop) — native bridge
```ts
// src/native/printer.service.ts  (main-process only; may import node deps)
import { defineNative } from '@sublime-ui/desktop';
export const printer = defineNative('printer', {
  async print(receipt: Receipt): Promise<void> { /* node code */ },
  async listDevices(): Promise<Device[]> { /* ... */ },
});
export type Printer = typeof printer;
```
```ts
// desktop/src/main/main.ts
registerNative([fs, dialog, shell, clipboard, notifications, printer]);
```
```ts
// any screen (renderer)
import { useNative } from '@sublime-ui/desktop';
import type { Printer } from '../../native/printer.service';
const printer = useNative<Printer>('printer');   // null on plain web
await printer?.print(receipt);
```
- One generic IPC channel (`native:invoke`). The renderer imports only `import type` of a service, so node deps never enter the web bundle.
- Security: `contextIsolation: true`, `nodeIntegration: false`; the main router rejects any `(module, method)` not registered. Errors surface as a typed `NativeError`.
- Built-in services: `fs`, `dialog`, `shell`, `clipboard`, `notifications`.
- Packaging via Electron Forge: `sublime desktop:dev` (Forge start + HMR), `sublime desktop:build` (Forge make → Windows/macOS/Linux installers). Desktop renders the WEB UI (no separate desktop screens).

## Devkit (`sublime` CLI)
- `make:model <Name>`, `make:component <Name>`, `theme:init`, `build:nav`, `desktop:dev`, `desktop:build`, `build` (offline Android APK), `run` (install/launch on a device), `doctor`, `setup`.
- Project config: `sublime.config.json` (`modelsDir`, `componentsDir`, `themeDir`, `navigationDir`, and a `desktop` block).

## Workspace layout (an app)
```
src/
  components/   # SHARED quartets (Card, Button…)
  models/       # SHARED models
  theme/        # SHARED tokens (tokens.json + tokens.ts)
  native/       # SHARED native service contracts (main-only impl)
  screens/
    web/        # web screens
    mobile/     # mobile screens
  navigation/   # storybook.web.ts / storybook.native.ts (+ generated)
web/            # web entry
mobile/         # React Native entry
desktop/        # Electron Forge shell (renderer mounts the web UI)
sublime.config.json
```
- Shared: components, models, theme, native contracts. Platform-specific: every screen + each platform's storybook. Desktop = web UI.

## Positioning truths (for honest comparison)
- TypeScript-only, no new language.
- Real platform-native UI (MUI on web, React Native Paper on mobile) — not a single custom render engine, not a webview.
- Model layer is Laravel/Eloquent-inspired, brought to the frontend.
- Navigation + native bridge are generated/validated at COMPILE time → full types, idiomatic per-platform output.
- One codebase spans mobile + web + desktop; desktop reuses the web UI.
