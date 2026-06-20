import { defineNative } from '@sublime-ui/desktop';

/** A sample native service. Runs in the main process; the renderer calls it via useNative. */
export const greeter = defineNative('greeter', {
  async hello(name: string): Promise<string> {
    return `Hello from the desktop main process, ${name}!`;
  },
});
