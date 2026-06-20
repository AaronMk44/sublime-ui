import { Model, registerModel } from '@sublime-ui/framework';

/** A sample model. Replace with your own — see the docs on the Model layer. */
export class Task extends Model {
  protected static resource = '/tasks';
  declare id: number;
  declare name: string;
  declare done: boolean;
}
registerModel(Task);
