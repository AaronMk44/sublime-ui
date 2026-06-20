import type { ModelField } from './fields.js';

export function renderModel(opts: {
  className: string;
  resource: string;
  fields: ModelField[];
  importAlias: string;
}): string {
  const hasId = opts.fields.some((f) => f.name === 'id');
  const fields = hasId
    ? opts.fields
    : [{ name: 'id', tsType: 'number' }, ...opts.fields];
  const declares = fields.map((f) => `  declare ${f.name}: ${f.tsType};`).join('\n');
  return `import { Model, registerModel } from '${opts.importAlias}/framework';

export class ${opts.className} extends Model {
  protected static resource = '${opts.resource}';
${declares}
}

// In-memory by default. For REST: registerModel(${opts.className}, HttpGateway).
registerModel(${opts.className});
`;
}
