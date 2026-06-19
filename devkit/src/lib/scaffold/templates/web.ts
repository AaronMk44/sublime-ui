export function renderWebTaskList(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Task } from '../../models/Task';

export function TaskList() {
  const tasks = Task.rxAll();
  const nav = useNav();
  return (
    <Screen>
      <Stack>
        {tasks.map((t) => (
          <button key={t.id} onClick={() => nav.turnTo('task', { id: t.id })}>
            {t.name}
          </button>
        ))}
      </Stack>
    </Screen>
  );
}
`;
}

export function renderWebTaskDetail(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav();
  const { id } = nav.params<{ id: number }>();
  const task = Task.rxFind(id);
  return (
    <Screen>
      <Stack>
        <h1>{task?.name ?? 'Loading…'}</h1>
        <button onClick={() => nav.turnBack()}>Back</button>
      </Stack>
    </Screen>
  );
}
`;
}

export function renderStorybookWeb(): string {
  return `import { book, page } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/web/TaskList';
import { TaskDetail } from '../screens/web/TaskDetail';

export default book({
  format: 'sidebar', // web: 'sidebar' | 'stack' | 'tabs'
  pages: {
    tasks: page(TaskList, { title: 'Tasks', initial: true }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task' }),
  },
});
`;
}

export function renderWebScreensBarrel(): string {
  return `export { TaskList } from '../screens/web/TaskList';
export { TaskDetail } from '../screens/web/TaskDetail';
`;
}

export function renderWebIndexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/web/main.tsx"></script>
  </body>
</html>
`;
}

export function renderWebMain(): string {
  return `import React from 'react';
import { createRoot } from 'react-dom/client';
import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

export function renderViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}
