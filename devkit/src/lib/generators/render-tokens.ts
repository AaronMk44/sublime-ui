export function renderTokensWrapper(importAlias: string): string {
  return `import data from './tokens.json';
import type { SublimeTokens } from '${importAlias}/library';

/** App design tokens. Edit tokens.json (the devkit-server customizer writes here). */
export const tokens = data as SublimeTokens;
`;
}
