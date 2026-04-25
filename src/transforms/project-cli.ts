import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

const PROJECT_CLI_PATTERNS = [
  { pattern: 'project.load($PATH)' },
  { pattern: 'brownie.run($SCRIPT)' },
  { pattern: 'run($SCRIPT)' },
  { pattern: 'interface.$NAME($ADDRESS)' },
];

const splitImportNames = (importList: string) => {
  return importList
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
};

const ensureImport = (source: string, importLine: string) => {
  return source.includes(importLine) ? source : `${importLine}\n${source}`;
};

const ensureApeImport = (source: string, importName: string) => {
  if (new RegExp(`^from\\s+ape\\s+import\\s+.*\\b${importName}\\b`, 'm').test(source)) {
    return source;
  }

  const fromApeImport = source.match(/^from\s+ape\s+import\s+([^\n]+)$/m);

  if (fromApeImport) {
    const names = [...new Set([...splitImportNames(fromApeImport[1]), importName])]
      .sort((left, right) => left.localeCompare(right));

    return source.replace(fromApeImport[0], `from ape import ${names.join(', ')}`);
  }

  return `from ape import ${importName}\n${source}`;
};

const ensureClickImport = (source: string) => {
  if (/^import\s+click\s*$/m.test(source)) {
    return source;
  }

  return source.replace(/^from\s+click\s+import\s+([^\n]+)$/m, (line, imports: string) => {
    const unsupported = splitImportNames(imports)
      .filter((name) => !['command', 'group', 'option', 'argument', 'pass_context'].includes(name))
      .map((name) => `# TODO: review click import "${name}" after Brownie CLI migration.`);

    return ['import click', ...unsupported].join('\n') || line;
  });
};

const replaceClickDecorators = (source: string) => {
  return source
    .replace(/^([ \t]*)@command\(/gm, '$1@click.command(')
    .replace(/^([ \t]*)@group\(/gm, '$1@click.group(')
    .replace(/^([ \t]*)@option\(/gm, '$1@click.option(')
    .replace(/^([ \t]*)@argument\(/gm, '$1@click.argument(')
    .replace(/^([ \t]*)@pass_context\b/gm, '$1@click.pass_context');
};

const renameClickMainEntrypoint = (source: string) => {
  if (!/@click\.(?:command|group)\(/.test(source)) {
    return source;
  }

  return source
    .replace(/\bdef\s+main\s*\(/, 'def cli(')
    .replace(/if\s+__name__\s*==\s*["']__main__["']:\s*\n[ \t]+main\(\)\s*$/m, '# ape run executes the `cli` command directly.');
};

const replaceProjectLoading = (source: string) => {
  let migrated = source
    .replace(/\bproject\.load\(\s*([^,\n)]+)(?:\s*,[^)]*)?\)/g, 'Project($1)')
    .replace(/\bProject\.load\(\s*([^,\n)]+)(?:\s*,[^)]*)?\)/g, 'Project($1)')
    .replace(/^([ \t]*)project\.close\([^)\n]*\)\s*$/gm, '$1# TODO: Ape Project(path) objects do not require Brownie project.close().');

  if (migrated !== source && /\bProject\(/.test(migrated)) {
    migrated = ensureApeImport(migrated, 'Project');
  }

  return migrated;
};

const replaceRunScriptCalls = (source: string) => {
  return source
    .replace(
      /^([ \t]*)(?:brownie\.)?run\(\s*["']([A-Za-z0-9_./-]+)["'](?:\s*,\s*["']main["'])?\s*\)\s*$/gm,
      '$1# TODO: run this script with `ape run $2`.',
    )
    .replace(
      /^([ \t]*)(?:brownie\.)?run\(\s*["']([A-Za-z0-9_./-]+)["']\s*,([^)\n]+)\)\s*$/gm,
      '$1# TODO: run this script with `ape run $2 -- <args>`; review migrated args:$3.',
    );
};

const replaceInterfaceWrappers = (source: string) => {
  let migrated = source.replace(
    /\binterface\.([A-Z][A-Za-z0-9_]*)\(([^)\n]+)\)/g,
    'project.$1.at($2)',
  );

  if (migrated !== source) {
    migrated = ensureApeImport(migrated, 'project');
  }

  return migrated;
};

const replaceScriptWeb3Calls = (source: string) => {
  let migrated = source
    .replace(/\bweb3\.eth\.chain_id\b/g, 'chain.chain_id')
    .replace(/\bweb3\.eth\.get_balance\(([^)\n]+)\)/g, 'chain.get_balance($1)')
    .replace(/\bweb3\.eth\.get_code\(([^)\n]+)\)/g, 'chain.provider.get_code($1)')
    .replace(/\bnetwork\.show_active\(\)/g, 'networks.provider.network.name');

  if (migrated !== source && /\bchain\./.test(migrated)) {
    migrated = ensureApeImport(migrated, 'chain');
  }

  if (migrated !== source && /\bnetworks\./.test(migrated)) {
    migrated = ensureApeImport(migrated, 'networks');
  }

  return migrated;
};

// Ape scripts are run with `ape run`; a script exposes either main() or a Click command named cli.
// Project loading uses Ape's top-level Project(path), and local project contracts use `project`.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();
  const hasProjectCliPattern = rootNode.findAll({ rule: { any: PROJECT_CLI_PATTERNS } }).length > 0;
  const hasBrownieScriptSurface =
    source.includes('from click import') ||
    source.includes('@command(') ||
    source.includes('brownie.run(') ||
    source.includes('project.close(') ||
    source.includes('interface.');

  if (!hasProjectCliPattern && !hasBrownieScriptSurface) {
    return null;
  }

  let migrated = source;
  migrated = ensureClickImport(migrated);
  migrated = replaceClickDecorators(migrated);
  migrated = renameClickMainEntrypoint(migrated);
  migrated = replaceProjectLoading(migrated);
  migrated = replaceRunScriptCalls(migrated);
  migrated = replaceInterfaceWrappers(migrated);
  migrated = replaceScriptWeb3Calls(migrated);

  if (migrated !== source && /@click\.(?:command|group|option|argument)|click\.pass_context/.test(migrated)) {
    migrated = ensureImport(migrated, 'import click');
  }

  return migrated === source ? null : migrated;
};

export default transform;
