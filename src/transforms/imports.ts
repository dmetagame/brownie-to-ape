import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';
type ImportMember = {
  readonly name: string;
  readonly alias: string | null;
};
const BROWNIE_IMPORT_PATTERNS = [
  { pattern: 'import brownie' },
  { pattern: 'import brownie.network as $ALIAS' },
  { pattern: 'from brownie import $$$IMPORTS' },
];
const APE_ROOT_IMPORTS = new Map<string, string[]>([
  ['accounts', ['accounts']],
  ['Account', ['accounts']],
  ['chain', ['chain']],
  ['config', ['config']],
  ['Contract', ['Contract']],
  ['history', ['chain']],
  ['interface', ['project']],
  ['network', ['networks']],
  ['project', ['project']],
  ['reverts', ['reverts']],
  ['Wei', ['convert']],
  ['ZERO_ADDRESS', ['ZERO_ADDRESS']],
]);
const parseImportMember = (rawMember: string): ImportMember | null => {
  const member = rawMember.trim();
  const match = member.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
  if (!match) {
    return null;
  }
  return {
    name: match[1],
    alias: match[2] ?? null,
  };
};
const formatImportMember = (name: string, alias: string | null) => {
  return alias === null ? name : `${name} as ${alias}`;
};
const sortImportMembers = (members: string[]) => {
  return [...new Set(members)].sort((left, right) => left.localeCompare(right));
};
const hasUnsafeContractContainerUsage = (source: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutImportDeclarations = source
    .replace(/^.*\bfrom\s+brownie\s+import\s+.*$/gm, '')
    .replace(/^.*\bimport\s+brownie(?:\.[A-Za-z0-9_.]+)?(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?.*$/gm, '');
  const withoutSafeContractContainerCalls = withoutImportDeclarations
    .replace(new RegExp(`\\b${escaped}\\.(?:deploy|at)\\s*\\(`, 'g'), '')
    .replace(new RegExp(`\\b${escaped}\\s*\\[[^\\]\\n]+\\]`, 'g'), '')
    .replace(new RegExp(`\\blen\\s*\\(\\s*${escaped}\\s*\\)`, 'g'), '');
  return new RegExp(`\\b${escaped}\\b`).test(withoutSafeContractContainerCalls);
};

const shouldPreserveUnsupportedMember = (source: string, member: ImportMember) => {
  if (APE_ROOT_IMPORTS.has(member.name)) {
    return false;
  }

  if (member.name === 'web3') {
    return /\bweb3\.(?:toWei|fromWei)\s*\(/.test(source);
  }

  if (/^[A-Z]/.test(member.name)) {
    return hasUnsafeContractContainerUsage(source, member.name);
  }

  return !APE_ROOT_IMPORTS.has(member.name);
};

const mapBrownieMember = (source: string, member: ImportMember) => {
  if (shouldPreserveUnsupportedMember(source, member)) {
    return { ape: [] as string[], brownie: [formatImportMember(member.name, member.alias)] };
  }

  const mappedNames = APE_ROOT_IMPORTS.get(member.name);
  if (mappedNames) {
    return { ape: mappedNames.map((name) => formatImportMember(name, member.alias)), brownie: [] as string[] };
  }

  if (/^[A-Z]/.test(member.name)) {
    return { ape: ['project'], brownie: [] as string[] };
  }

  return { ape: [] as string[], brownie: [formatImportMember(member.name, member.alias)] };
};

const transformBrownieFromImport = (line: string, source: string) => {
  const match = line.match(/^(\s*)from\s+brownie\s+import\s+(.+?)(\s*#.*)?$/);
  if (!match) {
    return line;
  }
  const [, indent, importList, comment = ''] = match;
  if (importList.trim() === '*') {
    return `${indent}from ape import *${comment}`;
  }
  const mappedMembers = importList
    .split(',')
    .map(parseImportMember)
    .filter((member): member is ImportMember => member !== null)
    .map((member) => mapBrownieMember(source, member));

  const apeMembers = mappedMembers.flatMap((member) => member.ape);
  const brownieMembers = mappedMembers.flatMap((member) => member.brownie);
  const lines: string[] = [];

  if (apeMembers.length > 0) {
    lines.push(`${indent}from ape import ${sortImportMembers(apeMembers).join(', ')}${comment}`);
  }

  if (brownieMembers.length > 0) {
    const todo = '  # TODO(brownie-to-ape): migrate this unsupported Brownie import manually.';
    lines.push(`${indent}from brownie import ${sortImportMembers(brownieMembers).join(', ')}${todo}`);
  }

  if (lines.length === 0) {
    return line;
  }

  return lines.join('\n');
};
const transformBrownieImport = (line: string) => {
  const networkImport = line.match(/^(\s*)import\s+brownie\.network\s+as\s+network(\s*#.*)?$/);
  if (networkImport) {
    return `${networkImport[1]}from ape import networks${networkImport[2] ?? ''}`;
  }

  const exactImport = line.match(/^(\s*)import\s+brownie(\s*#.*)?$/);
  if (exactImport) {
    return `${exactImport[1]}import ape${exactImport[2] ?? ''}`;
  }
  const aliasedImport = line.match(/^(\s*)import\s+brownie\s+as\s+([A-Za-z_][A-Za-z0-9_]*)(\s*#.*)?$/);
  if (aliasedImport) {
    return `${aliasedImport[1]}import ape as ${aliasedImport[2]}${aliasedImport[3] ?? ''}`;
  }
  return line;
};
// Collapse multiline parenthesized brownie imports into a single line so the
// per-line transform can match them. For example:
//   from brownie import (
//       MockV3Aggregator,
//       network,
//   )
// becomes: from brownie import MockV3Aggregator, network
const collapseMultilineImports = (source: string): string => {
  return source.replace(
    /^(\s*)from\s+brownie\s+import\s*\(\s*\n([\s\S]*?)\)/gm,
    (_match, indent, body) => {
      const members = body
        .split('\n')
        .map((l: string) => l.replace(/#.*$/, '').trim())
        .filter((l: string) => l.length > 0)
        .join(', ')
        .replace(/,\s*$/, '');
      return `${indent}from brownie import ${members}`;
    },
  );
};
// Ape root objects are documented at https://docs.apeworx.io/ape/latest/methoddocs/ape.html.
// This transform only rewrites syntactic Brownie import declarations to keep it composable
// with the accounts/contracts/networks transforms that update usage sites.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const hasBrownieImports = rootNode.findAll({ rule: { any: BROWNIE_IMPORT_PATTERNS } }).length > 0;
  if (!hasBrownieImports) {
    return null;
  }
  const source = rootNode.text();
  const collapsed = collapseMultilineImports(source);
  const migrated = collapsed
    .split('\n')
    .map((line) => transformBrownieImport(transformBrownieFromImport(line, collapsed)))
    .join('\n');
  return migrated === source ? null : migrated;
};
export default transform;
