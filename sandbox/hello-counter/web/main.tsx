import React from 'react';
import { createRoot } from 'react-dom/client';
import { SublimeProvider } from '@sublime-ui/library';
import { Navigation } from '../src/navigation';
import { tokens } from '../src/theme/tokens';

function App() {
  return (
    <SublimeProvider tokens={tokens}>
      <Navigation />
    </SublimeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
