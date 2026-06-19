// devkit/src/lib/scaffold/templates/shared.ts
export function renderTaskModel(): string {
  return `import { Model, registerModel } from '@sublime-ui/framework';

/** A sample model. Replace with your own — see the docs on the Model layer. */
export class Task extends Model {
  protected static resource = '/tasks';
  declare id: number;
  declare name: string;
  declare done: boolean;
}
registerModel(Task);
`;
}

export function renderModelsBarrel(): string {
  return `export * from './Task.js';
`;
}

export function renderThemeTokensJson(): string {
  // Minimal token set; \`sublime theme:init\` can later replace this with the
  // library defaults. Kept tiny and serializable on purpose.
  return JSON.stringify(
    {
      colors: { primary: '#4F46E5', background: '#FFFFFF', text: '#111827' },
      spacing: { sm: 8, md: 16, lg: 24 },
      radius: { md: 12 },
    },
    null,
    2,
  ) + '\n';
}

export function renderThemeTokensTs(): string {
  return `import tokensJson from './tokens.json' with { type: 'json' };
import type { SublimeTokens } from '@sublime-ui/library';

/** Typed app design tokens. Edit tokens.json; this stays a thin typed wrapper. */
export const tokens = tokensJson as unknown as SublimeTokens;
`;
}
