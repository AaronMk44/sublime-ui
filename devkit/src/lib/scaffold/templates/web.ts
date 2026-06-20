export function renderWebTaskList(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Card } from '@sublime-ui/library';
import { Task } from '../../models/Task';

export function TaskList() {
  const tasks = Task.rxAll();
  const nav = useNav();
  return (
    <Screen>
      <Stack>
        <Text variant="title">Tasks</Text>
        {tasks.length === 0 ? (
          <Text variant="body">No tasks yet — create one in your data layer to see it here.</Text>
        ) : (
          tasks.map((t) => (
            <Card key={t.id} padded onPress={() => nav.turnTo('task', { id: t.id })}>
              <Text variant="body">{t.name}</Text>
            </Card>
          ))
        )}
      </Stack>
    </Screen>
  );
}
`;
}

export function renderWebTaskDetail(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Button } from '@sublime-ui/library';
import type { AppRoutes } from '../../navigation';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav<AppRoutes>();
  const { id } = nav.params<'task'>();
  const task = Task.rxFind(id);
  return (
    <Screen>
      <Stack>
        <Text variant="title">{task?.name ?? 'Loading…'}</Text>
        <Button variant="outline" onPress={() => nav.turnBack()}>Back</Button>
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
  // All platforms write their build output under one \`dist/\` folder:
  // web → dist/web, desktop → dist/desktop, mobile → dist/mobile.
  build: { outDir: 'dist/web', emptyOutDir: true },
});
`;
}
