export interface ModelField {
  name: string;
  tsType: string;
}

const SCALARS = new Set(['string', 'number', 'boolean']);

export function parseFields(input: string): {
  fields: ModelField[];
  warnings: string[];
} {
  const fields: ModelField[] = [];
  const warnings: string[] = [];
  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const [rawName, rawType] = trimmed.split(':').map((s) => s.trim());
    if (rawName === undefined || rawName === '') continue;
    const type = rawType ?? 'string';
    if (SCALARS.has(type) || type.endsWith('[]')) {
      fields.push({ name: rawName, tsType: type });
    } else {
      warnings.push(`Field "${rawName}" has unknown type "${type}" — defaulting to string.`);
      fields.push({ name: rawName, tsType: 'string' });
    }
  }
  return { fields, warnings };
}
