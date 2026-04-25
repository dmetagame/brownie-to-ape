import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

const NETWORK_PATTERNS = [
  { pattern: 'network.show_active()' },
  { pattern: 'network.connect($NETWORK)' },
  { pattern: 'web3.eth.chain_id' },
  { pattern: 'web3.eth.get_balance($ADDRESS)' },
  { pattern: 'chain.height' },
];

const splitImportNames = (importList: string) => {
  return importList
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
};

const ensureApeImport = (source: string, importName: string) => {
  if (new RegExp(`^from\\s+ape\\s+import\\s+.*\\b${importName}\\b`, 'm').test(source)) {
    return source;
  }

  const fromApeImport = source.match(/^from\s+ape\s+import\s+([^\n]+)$/m);

  if (fromApeImport) {
    const nextNames = [...new Set([...splitImportNames(fromApeImport[1]), importName])]
      .sort((left, right) => left.localeCompare(right));

    return source.replace(fromApeImport[0], `from ape import ${nextNames.join(', ')}`);
  }

  return `from ape import ${importName}\n${source}`;
};

const replaceNetworkConnectExpression = (source: string) => {
  return source.replace(
    /^([ \t]*)network\.connect\(([^)\n]+)\)\s*$/gm,
    (_match, indent: string, networkChoice: string) => [
      `${indent}with networks.parse_network_choice(${networkChoice}) as provider:`,
      `${indent}    pass  # TODO: move network-scoped work into this Ape provider context`,
    ].join('\n'),
  );
};

const replaceWeb3ProviderPatterns = (source: string) => {
  return source
    .replace(/\bnetwork\.show_active\(\)/g, 'networks.provider.network.name')
    .replace(/\bweb3\.eth\.chain_id\b/g, 'chain.chain_id')
    .replace(/\bweb3\.eth\.block_number\b/g, 'chain.blocks.height')
    .replace(/\bchain\.height\b/g, 'chain.blocks.height')
    .replace(/\bweb3\.eth\.get_balance\(([^)\n]+)\)/g, 'chain.get_balance($1)')
    .replace(/\bweb3\.toWei\(([^,\n]+),\s*["']ether["']\)/g, 'convert($1, int)')
    .replace(/\bweb3\.fromWei\(([^,\n]+),\s*["']ether["']\)/g, 'convert($1, str)');
};

// Ape network choice and provider context managers are documented in the networks guide.
// This transform handles Brownie's most common `network`, `web3`, and chain-id idioms.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const hasNetworkPattern = rootNode.findAll({ rule: { any: NETWORK_PATTERNS } }).length > 0;

  if (!hasNetworkPattern) {
    return null;
  }

  const source = rootNode.text();
  let migrated = source;
  migrated = replaceNetworkConnectExpression(migrated);
  migrated = replaceWeb3ProviderPatterns(migrated);

  if (migrated !== source && /\bnetworks\./.test(migrated)) {
    migrated = ensureApeImport(migrated, 'networks');
  }

  if (migrated !== source && /\bchain\./.test(migrated)) {
    migrated = ensureApeImport(migrated, 'chain');
  }

  if (migrated !== source && /\bconvert\(/.test(migrated)) {
    migrated = ensureApeImport(migrated, 'convert');
  }

  return migrated === source ? null : migrated;
};

export default transform;
