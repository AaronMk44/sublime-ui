import { book, page } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/web/TaskList';
import { TaskDetail } from '../screens/web/TaskDetail';

export default book({
  format: 'sidebar', // web: 'sidebar' | 'stack' | 'tabs'
  pages: {
    tasks: page(TaskList, { title: 'Tasks', initial: true }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task' }),
  },
});
