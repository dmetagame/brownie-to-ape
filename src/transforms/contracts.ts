import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

const CONTRACT_PATTERNS = [
  { pattern: 'Contract.at($ADDRESS)' },
  { pattern: 'Contract.from_abi($NAME, $ADDRESS, $ABI)' },
  { pattern: '$CONTRACT.deploy($$$ARGS)' },
  { pattern: '$CONTRACT.at($ADDRESS)' },
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

const PYTHON_TYPING_NAMES = new Set([
  'Annotated',
  'Any',
  'Callable',
  'ClassVar',
  'Dict',
  'Final',
  'Generic',
  'Iterable',
  'Iterator',
  'List',
  'Literal',
  'Mapping',
  'Optional',
  'Sequence',
  'Set',
  'Tuple',
  'Type',
  'TypeVar',
  'Union',
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
    .replace(/^([ \t]*)\{([^{}\n]*["']from["'][^{}\n]*)\}\s*,\s*$/gm, (_match, indent: string, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `${indent}${kwargs},`;
    })
    .replace(/\(\s*\{([^{}\n]*["']from["'][^{}\n]*)\}\s*,/g, (_match, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `(${kwargs},`;
    })
    .replace(/,\s*\{([^{}\n]*["']from["'][^{}\n]*)\}\s*(?=\))/g, (_match, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `, ${kwargs}`;
    })
    .replace(/,\s*\{([^{}\n]*["']from["'][^{}\n]*)\}\s*,/g, (_match, body: string) => {
      const kwargs = convertBrownieTxDict(body);
      return kwargs === null ? _match : `, ${kwargs},`;
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

const hasProjectImport = (source: string) => /^from\s+ape\s+import\s+.*\bproject\b/m.test(source);

const hasLocalSymbolBinding = (source: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`^(?:class|def)\\s+${escaped}\\b|^${escaped}\\s*=`, 'm').test(source);
};

const hasExplicitNonBrownieImport = (source: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`^(?:from\\s+(?!brownie\\b)[^\\n]+\\s+import\\s+.*\\b${escaped}\\b|import\\s+${escaped}\\b)`, 'm').test(source);
};

const shouldRewriteProjectContainer = (source: string, contractName: string) => {
  if (contractName === 'Contract' || PYTHON_TYPING_NAMES.has(contractName)) {
    return false;
  }

  return hasProjectImport(source) && !hasLocalSymbolBinding(source, contractName) && !hasExplicitNonBrownieImport(source, contractName);
};

const replaceProjectContractContainers = (source: string) => {
  return source
    .replace(/(?<![\w.])([A-Z][A-Za-z0-9_]*)\.at\(/g, (match, contractName: string) => {
      if (!shouldRewriteProjectContainer(source, contractName)) {
        return match;
      }

      return `project.${contractName}.at(`;
    })
    .replace(/(?<![\w.])([A-Z][A-Za-z0-9_]*)\s*\[([^\]\n]+)\]/g, (_match, contractName: string, index: string) => {
      if (!shouldRewriteProjectContainer(source, contractName)) {
        return _match;
      }

      return `project.${contractName}.deployments[${index.trim()}]`;
    })
    .replace(/\blen\(\s*([A-Z][A-Za-z0-9_]*)\s*\)/g, (_match, contractName: string) => {
      if (!shouldRewriteProjectContainer(source, contractName)) {
        return _match;
      }

      return `len(project.${contractName}.deployments)`;
    });
};

// Ape contract deployment and address lookup are documented in the Ape contracts guide.
// Brownie contract containers are direct globals; Ape uses `project.<ContractName>` containers.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const hasContractPattern = rootNode.findAll({ rule: { any: CONTRACT_PATTERNS } }).length > 0;
  const source = rootNode.text();

  if (
    !hasContractPattern &&
    !/["']from["']\s*:/.test(source) &&
    !/(?<![\w.])[A-Z][A-Za-z0-9_]*(?:\s*\[[^\]\n]+\]|\.at\()/.test(source) &&
    !/\blen\(\s*[A-Z][A-Za-z0-9_]*\s*\)/.test(source)
  ) {
    return null;
  }

  let migrated = source;
  migrated = replaceContractAddressLookups(migrated);
  migrated = replaceProjectDeployments(migrated);
  migrated = replaceProjectContractContainers(migrated);
  migrated = replaceTransactionDictionaries(migrated);

  if (migrated !== source && /(?<![\w.])Contract\(/.test(migrated)) {
    migrated = ensureApeImport(migrated, 'Contract');
  }

  if (migrated !== source && /\bproject\.[A-Z][A-Za-z0-9_]*\.(?:deploy|at|deployments)\b/.test(migrated)) {
    migrated = ensureApeImport(migrated, 'project');
  }

  return migrated === source ? null : migrated;
};

export default transform;
