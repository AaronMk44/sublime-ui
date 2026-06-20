import { book, page } from '@sublime-ui/ui/navigation';
import { TaskList } from '../screens/mobile/TaskList.native';
import { TaskDetail } from '../screens/mobile/TaskDetail.native';

export default book({
  format: 'bottomNav', // mobile: 'drawer' | 'stack' | 'bottomNav' (<= 5 pages)
  pages: {
    tasks: page(TaskList, { title: 'Tasks', icon: 'format-list-bulleted', initial: true }),
    task: page<{ id: number }>(TaskDetail, { title: 'Task', icon: 'note' }),
  },
});
