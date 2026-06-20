import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

export function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}
