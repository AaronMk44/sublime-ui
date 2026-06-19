# @sublime-ui/desktop

Electron desktop packaging and a secure **native bridge** for
[Sublime UI](https://sublime-ui.github.io/sublime-ui/) apps. The desktop target
renders your existing **web** UI and adds access to native capabilities.

Define a native service in the main process and call it from the renderer with a
typed hook. Everything travels over one generic, `contextIsolation`-safe IPC
channel.

```ts
// main process — define + register
import { defineNative, registerNative } from '@sublime-ui/desktop';
export const greeter = defineNative('greeter', {
  async hello(name: string) { return `Hello, ${name}!`; },
});
registerNative([greeter]);
```

```ts
// renderer — renderer-safe entry, returns null on web/mobile
import { useNative } from '@sublime-ui/desktop/client';
const greeter = useNative<typeof import('./greeter').greeter>('greeter');
await greeter?.hello('world');
```

Built-in services cover `fs`, `dialog`, `shell`, `clipboard`, and
`notifications`. Packaging uses Electron Forge via
`sublime desktop:dev` / `sublime desktop:build`.

> Import renderer code from `@sublime-ui/desktop/client` — it contains **no**
> node/electron and is safe to bundle into the web build.

## Install

```bash
npm install @sublime-ui/desktop
```

## Documentation

The native bridge and packaging:
**https://sublime-ui.github.io/sublime-ui/docs/desktop/overview**

## License

MIT
