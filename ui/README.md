# @sublime-ui/ui

Cross-platform **navigation** and **layout primitives** for
[Sublime UI](https://sublime-ui.github.io/sublime-ui/).

Navigation is authored as a **storybook** — a `book` of `page`s, written once per
platform — and compiled ahead of time (by `@sublime-ui/devkit`'s `build:nav`)
into idiomatic React Navigation (mobile) and react-router (web), with a fully
typed route map.

```ts
import { book, page, link } from '@sublime-ui/ui/navigation';
import { Home } from '../screens/web/Home';

export default book({
  format: 'sidebar', // web: 'sidebar' | 'stack' | 'tabs'
  pages: {
    home: page(Home, { title: 'Home' }),
  },
});
```

At runtime, `useNav()` gives you type-checked navigation: `turnTo`, `turnBack`,
`current`, and `params<T>()`. Layout primitives (`Screen`, `Stack`, `Row`,
`Spacer`) render natively on each platform.

## Install

```bash
npm install @sublime-ui/ui
```

## Documentation

The storybook model and typed navigation:
**https://sublime-ui.github.io/sublime-ui/docs/navigation/storybook**

## License

MIT
