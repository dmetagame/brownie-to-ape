import { type Transform } from 'codemod:ast-grep';
import type YAML from 'codemod:ast-grep/langs/yaml';

type BrownieNetwork = {
  readonly name: string;
  readonly host: string | null;
  readonly verify: boolean;
};

const BROWNIE_CONFIG_PATTERNS = [
  { pattern: 'compiler:' },
  { pattern: 'networks:' },
  { pattern: 'wallets:' },
];

const scalarAfter = (source: string, key: string) => {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*([^\\n#]+)`, 'm'));
  return match?.[1]?.trim() ?? null;
};

const collectSolcRemappings = (source: string) => {
  const remappingBlock = source.match(/^\s*remappings:\s*\n((?:\s+-\s+.+\n?)+)/m)?.[1] ?? '';

  return remappingBlock
    .split('\n')
    .map((line) => line.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line));
};

const collectNetworks = (source: string): BrownieNetwork[] => {
  const lines = source.split('\n');
  const networks: BrownieNetwork[] = [];
  const sectionStart = lines.findIndex((line) => /^networks:\s*$/.test(line));

  if (sectionStart === -1) {
    return networks;
  }

  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\S/.test(line)) {
      break;
    }

    const networkHeader = line.match(/^  ([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!networkHeader) {
      continue;
    }

    const name = networkHeader[1];
    const inlineValue = networkHeader[2].trim();

    if (name === 'default' || name === 'development' || inlineValue.length > 0) {
      continue;
    }

    const body: string[] = [];

    for (let bodyIndex = index + 1; bodyIndex < lines.length; bodyIndex += 1) {
      const bodyLine = lines[bodyIndex];

      if (/^\S/.test(bodyLine) || /^  [A-Za-z0-9_-]+:/.test(bodyLine)) {
        break;
      }

      body.push(bodyLine);
      index = bodyIndex;
    }

    const bodyText = body.join('\n');
    networks.push({
      name,
      host: bodyText.match(/^\s+host:\s*([^\n#]+)/m)?.[1]?.trim() ?? null,
      verify: /^\s+verify:\s*true\s*$/m.test(bodyText),
    });
  }

  return networks;
};

const quoteYaml = (value: string) => {
  if (/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(value)) {
    return value;
  }

  return value;
};

const topLevelBlock = (source: string, key: string) => {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));

  if (start === -1) {
    return [];
  }

  const block = [lines[start]];

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^\S/.test(line)) {
      break;
    }

    block.push(line);
  }

  while (block.length > 0 && block[block.length - 1].trim() === '') {
    block.pop();
  }

  return block;
};

const renderApeConfig = (source: string) => {
  const solcVersion = scalarAfter(source, 'version') ?? '0.8.20';
  const remappings = collectSolcRemappings(source);
  const networks = collectNetworks(source);
  const needsEtherscan = networks.some((network) => network.verify);
  const needsNode = networks.some((network) => network.host !== null);
  const lines: string[] = [];

  lines.push('name: migrated-ape-project');
  lines.push('plugins:');
  lines.push('  - name: solidity');

  if (needsEtherscan) {
    lines.push('  - name: etherscan');
  }

  if (needsNode) {
    lines.push('  - name: node');
  }

  lines.push('solidity:');
  lines.push(`  version: ${solcVersion}`);

  if (remappings.length > 0) {
    lines.push('  import_remapping:');
    for (const remapping of remappings) {
      lines.push(`    - ${remapping}`);
    }
  }

  lines.push('ethereum:');
  lines.push('  default_network: local');

  for (const network of networks) {
    if (network.host !== null || network.verify) {
      lines.push(`  ${network.name}:`);

      if (network.host !== null) {
        lines.push('    default_provider: node');
      }
    }
  }

  if (needsNode) {
    lines.push('node:');
    lines.push('  ethereum:');

    for (const network of networks) {
      if (network.host !== null) {
        lines.push(`    ${network.name}:`);
        lines.push(`      uri: ${quoteYaml(network.host)}`);
      }
    }
  }

  if (/^wallets:\s*$/m.test(source)) {
    lines.push('# TODO: Brownie `wallets.from_key` is intentionally not copied.');
    lines.push('# Import the key once with `ape accounts import <alias>` and use `accounts.load("<alias>")`.');
  }

  const legacyNetworks = topLevelBlock(source, 'networks');

  if (legacyNetworks.length > 0) {
    lines.push('');
    lines.push('# Legacy Brownie network values retained for migrated scripts that still read config["networks"].');
    lines.push(...legacyNetworks);
  }

  return `${lines.join('\n')}\n`;
};

// Ape project configuration is documented at https://docs.apeworx.io/ape/stable/userguides/config.html.
// This YAML transform updates Brownie's compiler/network/wallet schema to Ape's plugin config shape.
const transform: Transform<YAML> = async (root) => {
  const rootNode = root.root();
  const hasBrownieConfigShape = rootNode.findAll({ rule: { any: BROWNIE_CONFIG_PATTERNS } }).length > 0;

  if (!hasBrownieConfigShape) {
    return null;
  }

  const source = rootNode.text();
  const migrated = renderApeConfig(source);

  return migrated === source ? null : migrated;
};

export default transform;
