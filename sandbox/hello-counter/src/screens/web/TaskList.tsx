import { useState } from 'react';
import { Screen, Stack } from '@sublime-ui/ui';

export function TaskList() {
  const [count, setCount] = useState(0);
  return (
    <Screen>
      <Stack>
        <h1>Hello World</h1>
        <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
      </Stack>
    </Screen>
  );
}
