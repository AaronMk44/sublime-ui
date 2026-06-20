import { useState } from 'react';
import { Screen, Stack } from '@sublime-ui/ui';
import { Button, Text } from 'react-native-paper';

export function TaskList() {
  const [count, setCount] = useState(0);
  return (
    <Screen>
      <Stack>
        <Text variant="headlineMedium">Hello World</Text>
        <Button mode="contained" onPress={() => setCount((c) => c + 1)}>
          Count: {count}
        </Button>
      </Stack>
    </Screen>
  );
}
