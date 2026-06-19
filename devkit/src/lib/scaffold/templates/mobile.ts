export function renderMobileTaskList(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Button } from 'react-native-paper';
import { Task } from '../../models/Task';

export function TaskList() {
  const tasks = Task.rxAll();
  const nav = useNav();
  return (
    <Screen>
      <Stack>
        {tasks.map((t) => (
          <Button key={t.id} onPress={() => nav.turnTo('task', { id: t.id })}>
            {t.name}
          </Button>
        ))}
      </Stack>
    </Screen>
  );
}
`;
}

export function renderMobileTaskDetail(): string {
  return `import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Button } from 'react-native-paper';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav();
  const { id } = nav.params<{ id: number }>();
  const task = Task.rxFind(id);
  return (
    <Screen>
      <Stack>
        <Text variant="headlineMedium">{task?.name ?? 'Loading…'}</Text>
        <Button onPress={() => nav.turnBack()}>Back</Button>
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
  return `import { AppRegistry } from 'react-native';
import { App } from './App.native';
import { name as appName } from '../app.json';

AppRegistry.registerComponent(appName, () => App);
`;
}

export function renderMobileApp(): string {
  return `import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

export function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}
`;
}
