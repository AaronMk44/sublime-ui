import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GeneratorConfig {
  modelsDir: string;
  componentsDir: string;
  themeDir: string;
  importAlias: string;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  modelsDir: 'src/models',
  componentsDir: 'src/components',
  themeDir: 'src/theme',
  importAlias: '@sublime-ui',
};

export function loadConfig(cwd: string): GeneratorConfig {
  const path = join(cwd, 'sublime.config.json');
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<GeneratorConfig>;
  const result: GeneratorConfig = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof GeneratorConfig)[]) {
    const value = raw[key];
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}
