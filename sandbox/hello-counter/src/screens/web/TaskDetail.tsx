import { Screen, Stack } from '@sublime-ui/ui';
import { useNav } from '@sublime-ui/ui/navigation';
import type { AppRoutes } from '../../navigation';
import { Task } from '../../models/Task';

export function TaskDetail() {
  const nav = useNav<AppRoutes>();
  const { id } = nav.params<'task'>();
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
