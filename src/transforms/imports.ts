import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

type ImportMember = {
  readonly name: string;
  readonly alias: string | null;
};

const BROWNIE_IMPORT_PATTERNS = [
  { pattern: 'import brownie' },
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
  ['web3', ['chain']],
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

const mapBrownieMember = (member: ImportMember) => {
  const mappedNames = APE_ROOT_IMPORTS.get(member.name);

  if (mappedNames) {
    return mappedNames.map((name) => formatImportMember(name, member.alias));
  }

  // Brownie exposes project contract containers as direct imports, e.g. `Token`.
  // Ape docs access local contract containers through `project.Token`, so unknown
  // PascalCase imports become `project`; usage is handled by contracts.ts.
  if (/^[A-Z]/.test(member.name)) {
    return ['project'];
  }

  return [`project # TODO: review unsupported Brownie import "${member.name}"`];
};

const transformBrownieFromImport = (line: string) => {
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
    .flatMap((member) => (member === null ? [] : mapBrownieMember(member)));

  if (mappedMembers.length === 0) {
    return line;
  }

  return `${indent}from ape import ${sortImportMembers(mappedMembers).join(', ')}${comment}`;
};

const transformBrownieImport = (line: string) => {
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
  const migrated = source
    .split('\n')
    .map((line) => transformBrownieImport(transformBrownieFromImport(line)))
    .join('\n');

  return migrated === source ? null : migrated;
};

export default transform;
