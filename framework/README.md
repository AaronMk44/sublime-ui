# @sublime-ui/framework

The data + state core of [Sublime UI](https://sublime-ui.github.io/sublime-ui/) —
write the non-UI parts of your app once and run them on mobile, web, and desktop.

It gives you a Laravel/Eloquent-style **Model** layer with a reactive,
cache-first data flow: define a model, register it, and read it from any screen.

```ts
import { Model, registerModel } from '@sublime-ui/framework';

export class Task extends Model {
  protected static resource = '/tasks';
  declare id: number;
  declare name: string;
  declare done: boolean;
}
registerModel(Task);

// In a screen — reactive, cache-first:
const tasks = Task.rxAll();
```

`registerModel` wires up a fetch-based Gateway (CRUD over `resource`), an
auto-registering Redux slice, and a discovery registry — no extra boilerplate.

## Install

```bash
npm install @sublime-ui/framework
```

## Documentation

Full guides, the model API, and the cross-platform story:
**https://sublime-ui.github.io/sublime-ui/docs/framework/overview**

## License

MIT
