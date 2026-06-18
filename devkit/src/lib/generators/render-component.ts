export function renderComponentTypes(name: string): string {
  return `import type { ReactNode } from 'react';

export type Variant = 'solid' | 'soft' | 'outline' | 'ghost';
export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
export type Size = 'sm' | 'md' | 'lg';

export interface ${name}Props {
  children?: ReactNode;
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  testID?: string;
}
`;
}

export function renderComponentWeb(name: string, mobileOnly: boolean, importAlias: string): string {
  if (mobileOnly) {
    return `import type { ${name}Props } from './${name}.types.js';

/** ${name} is mobile-only and renders nothing on web. */
export function ${name}(_props: ${name}Props) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('${name} is mobile-only and renders nothing on web.');
  }
  return null;
}
`;
  }
  return `import { Box } from '@mui/material';
import { useTokens } from '${importAlias}/library';
import type { ${name}Props } from './${name}.types.js';

export function ${name}({ children, testID }: ${name}Props) {
  const tokens = useTokens();
  return (
    <Box data-testid={testID} sx={{ borderRadius: \`\${tokens.radii.md}px\` }}>
      {children}
    </Box>
  );
}
`;
}

export function renderComponentNative(name: string, importAlias: string): string {
  return `import { View } from 'react-native';
import { useTokens } from '${importAlias}/library';
import type { ${name}Props } from './${name}.types.js';

export function ${name}({ children, testID }: ${name}Props) {
  const tokens = useTokens();
  return (
    <View testID={testID} style={{ borderRadius: tokens.radii.md }}>
      {children}
    </View>
  );
}
`;
}

export function renderComponentIndex(name: string): string {
  return `export { ${name} } from './${name}.js';
export type { ${name}Props } from './${name}.types.js';
`;
}
