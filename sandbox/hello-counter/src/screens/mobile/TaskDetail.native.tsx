import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import { Text, Button } from 'react-native-paper';
import type { AppRoutes } from '../../navigation';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav<AppRoutes>();
  const { id } = nav.params<'task'>();
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
