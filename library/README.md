# @sublime-ui/library

The cross-platform design system for [Sublime UI](https://sublime-ui.github.io/sublime-ui/).

It is **tokens-first**: a single serializable `SublimeTokens` object drives both
the web theme (Material UI) and the mobile theme (React Native Paper), and a
shared set of components renders idiomatically on each platform.

```tsx
import { SublimeProvider } from '@sublime-ui/library';
import { tokens } from './theme/tokens';

export function App() {
  return (
    <SublimeProvider tokens={tokens}>
      {/* navigation + screens */}
    </SublimeProvider>
  );
}
```

`generateThemes` turns your tokens into the per-platform theme objects, and
`useTokens()` makes them available anywhere.

## Install

```bash
npm install @sublime-ui/library
```

Web apps also need `@mui/material` + `@emotion/{react,styled}`; mobile apps need
`react-native-paper` + `react-native-safe-area-context` (declared as optional
peers).

## Documentation

Core components and theming:
**https://sublime-ui.github.io/sublime-ui/docs/library/components/overview**

## License

MIT
