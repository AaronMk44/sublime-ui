export function renderMobileTaskList(): string {
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

export function renderMobileTaskDetail(): string {
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

export function renderStorybookNative(): string {
  return `import { book, page } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/mobile/TaskList.native';
import { TaskDetail } from '../screens/mobile/TaskDetail.native';

export default book({
  format: 'bottomNav', // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    tasks: page(TaskList, { title: 'Tasks', icon: 'format-list-bulleted', initial: true }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task', icon: 'note' }),
  },
});
`;
}

export function renderMobileScreensBarrel(): string {
  return `export { TaskList } from '../screens/mobile/TaskList.native';
export { TaskDetail } from '../screens/mobile/TaskDetail.native';
`;
}

export function renderMobileEntry(): string {
  return `import { registerRootComponent } from 'expo';
import { App } from './App.native';

registerRootComponent(App);
`;
}

export function renderMobileApp(): string {
  return `import { Provider } from 'react-redux';
import { store } from '@sublime-ui/framework';
import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

export function App() {
  return (
    <Provider store={store}>
      <SublimeProvider tokens={tokens}>
        <Navigation />
      </SublimeProvider>
    </Provider>
  );
}
`;
}

export function renderMetroConfig(): string {
  return `const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// @sublime-ui/* ship an \`exports\` map and no legacy \`main\`; Metro must honor
// package "exports" to resolve them on React Native.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
`;
}
