function pascalCase(input: string): string {
  return input
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function pluralize(word: string): string {
  const w = word.toLowerCase();
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
  if (/(s|x|ch|sh)$/.test(w)) return w + 'es';
  return w + 's';
}

export function deriveNames(name: string): {
  className: string;
  resource: string;
  sliceName: string;
  fileName: string;
} {
  const className = pascalCase(name);
  const plural = pluralize(className);
  return {
    className,
    resource: `/${plural}`,
    sliceName: plural,
    fileName: className,
  };
}
