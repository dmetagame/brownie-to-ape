import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

const CONTRACT_PATTERNS = [
  { pattern: 'Contract.at($ADDRESS)' },
  { pattern: 'Contract.from_abi($NAME, $ADDRESS, $ABI)' },
  { pattern: '$CONTRACT.deploy($$$ARGS)' },
];

const TX_KEY_MAP = new Map<string, string>([
  ['from', 'sender'],
  ['gas', 'gas_limit'],
  ['gas_limit', 'gas_limit'],
  ['gas_price', 'gas_price'],
  ['max_fee', 'max_fee'],
  ['max_priority_fee', 'max_priority_fee'],
  ['nonce', 'nonce'],
  ['required_confs', 'required_confirmations'],
  ['value', 'value'],
]);

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

const splitTopLevelCommas = (value: string) => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];

    if (quote !== null) {
      current += char;
      if (char === quote && previous !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
    }

    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
    }

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) {
    parts.push(current.trim());
  }

  return parts;
};

const convertBrownieTxDict = (body: string) => {
  const kwargs = splitTopLevelCommas(body).map((entry) => {
    const match = entry.match(/^["']([^"']+)["']\s*:\s*(.+)$/s);

    if (!match) {
      return null;
    }

    const mappedKey = TX_KEY_MAP.get(match[1]);
    return mappedKey ? `${mappedKey}=${match[2].trim()}` : null;
  });

  if (kwargs.some((entry) => entry === null)) {
    return null;
  }

  return kwargs.join(', ');
};

const replaceTransactionDictionaries = (source: string) => {
  return source
    .replace(/\(\s*\{([^{}\n]*["']from["'][^{}\n]*)\}\s*,/g, (_match, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `(${kwargs},`;
    })
    .replace(/,\s*\{([^{}\n]*["']from["'][^{}\n]*)\}\s*(?=\))/g, (_match, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `, ${kwargs}`;
    })
    .replace(/\(\s*\{([^{}\n]*["']from["'][^{}\n]*)\}\s*\)/g, (_match, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `(${kwargs})`;
    });
};

const replaceContractAddressLookups = (source: string) => {
  return source
    .replace(/(?<![\w.])Contract\.at\(([^)\n]+)\)/g, 'Contract($1)')
    .replace(/(?<![\w.])Contract\.from_abi\(\s*([^,\n]+)\s*,\s*([^,\n]+)\s*,\s*([^)]+)\)/g, 'Contract($2, contract_type=$3)');
};

const replaceProjectDeployments = (source: string) => {
  return source.replace(/(?<![\w.])([A-Z][A-Za-z0-9_]*)\.deploy\(/g, (match, contractName: string) => {
    if (contractName === 'Contract') {
      return match;
    }

    return `project.${contractName}.deploy(`;
  });
};

// Ape contract deployment and address lookup are documented in the Ape contracts guide.
// Brownie contract containers are direct globals; Ape uses `project.<ContractName>` containers.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const hasContractPattern = rootNode.findAll({ rule: { any: CONTRACT_PATTERNS } }).length > 0;
  const source = rootNode.text();

  if (!hasContractPattern && !/["']from["']\s*:/.test(source)) {
    return null;
  }

  let migrated = source;
  migrated = replaceContractAddressLookups(migrated);
  migrated = replaceProjectDeployments(migrated);
  migrated = replaceTransactionDictionaries(migrated);

  if (migrated !== source && /(?<![\w.])Contract\(/.test(migrated)) {
    migrated = ensureApeImport(migrated, 'Contract');
  }

  if (migrated !== source && /\bproject\.[A-Z][A-Za-z0-9_]*\.deploy\(/.test(migrated)) {
    migrated = ensureApeImport(migrated, 'project');
  }

  return migrated === source ? null : migrated;
};

export default transform;
