import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

const TESTING_PATTERNS = [
  { pattern: 'brownie.reverts($$$ARGS)' },
  { pattern: 'reverts($$$ARGS)' },
  { pattern: 'pytest.mark.require_network($NETWORK)' },
  { pattern: '$TX.events[$EVENT]' },
  { pattern: 'web3.eth.get_block($BLOCK)' },
];

const ISOLATION_FIXTURE_NAMES = new Set(['fn_isolation', 'module_isolation', 'isolation']);

const splitImportNames = (importList: string) => {
  return importList
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
};

const ensureImport = (source: string, importLine: string) => {
  return source.includes(importLine) ? source : `${importLine}\n${source}`;
};

const ensureApeImport = (source: string) => {
  if (/^import\s+ape\s*$/m.test(source) || /^import\s+ape\s+as\s+/m.test(source)) {
    return source;
  }

  return `import ape\n${source}`;
};

const ensureHypothesisStrategiesImport = (source: string) => {
  if (/^from\s+hypothesis\s+import\s+.*\bst\b/m.test(source)) {
    return source;
  }

  const importMatch = source.match(/^from\s+hypothesis\s+import\s+([^\n]+)$/m);

  if (importMatch) {
    const names = [...new Set([...splitImportNames(importMatch[1]), 'strategies as st'])]
      .sort((left, right) => left.localeCompare(right));

    return source.replace(importMatch[0], `from hypothesis import ${names.join(', ')}`);
  }

  return ensureImport(source, 'from hypothesis import strategies as st');
};

const replaceBrownieReverts = (source: string) => {
  let migrated = source
    .replace(/\bbrownie\.reverts\(/g, 'ape.reverts(')
    .replace(/(?<![\w.])reverts\(/g, 'ape.reverts(');

  if (migrated !== source) {
    migrated = ensureApeImport(migrated);
    migrated = migrated.replace(/^from\s+brownie\s+import\s+reverts\s*$/m, 'import ape');
    migrated = migrated.replace(/^from\s+ape\s+import\s+reverts\s*$/m, 'import ape');
  }

  return migrated;
};

const removeIsolationFixtureParameters = (source: string) => {
  return source.replace(
    /\bdef\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:/g,
    (match, functionName: string, parameterList: string) => {
      const parameters = parameterList
        .split(',')
        .map((parameter) => parameter.trim())
        .filter(Boolean);

      const nextParameters = parameters.filter((parameter) => {
        const parameterName = parameter.split(':')[0].split('=')[0].trim();
        return !ISOLATION_FIXTURE_NAMES.has(parameterName);
      });

      if (parameters.length === nextParameters.length) {
        return match;
      }

      return `def ${functionName}(${nextParameters.join(', ')}):`;
    },
  );
};

const replaceBrownieNetworkMarks = (source: string) => {
  return source.replace(
    /@pytest\.mark\.require_network\(([^)\n]+)\)/g,
    '@pytest.mark.use_network($1)  # TODO: verify Ape network choice semantics',
  );
};

const replaceHypothesisStrategies = (source: string) => {
  let migrated = source
    .replace(
      /^from\s+brownie\.test\s+import\s+given,\s*strategy\s*$/m,
      'from hypothesis import given, strategies as st',
    )
    .replace(
      /^from\s+brownie\.test\s+import\s+strategy,\s*given\s*$/m,
      'from hypothesis import given, strategies as st',
    )
    .replace(/^from\s+brownie\.test\s+import\s+given\s*$/m, 'from hypothesis import given')
    .replace(/^from\s+brownie\.test\s+import\s+strategy\s*$/m, 'from hypothesis import strategies as st');

  const beforeStrategies = migrated;

  migrated = migrated
    .replace(/\bstrategy\(\s*["']u?int(?:8|16|32|64|128|256)?["']([^)]*)\)/g, 'st.integers($1)')
    .replace(/\bstrategy\(\s*["']bool["']\s*\)/g, 'st.booleans()')
    .replace(/\bstrategy\(\s*["']bytes(?:[0-9]+)?["']([^)]*)\)/g, 'st.binary($1)')
    .replace(/\bstrategy\(\s*["']string["']([^)]*)\)/g, 'st.text($1)');

  if (migrated !== beforeStrategies) {
    migrated = ensureHypothesisStrategiesImport(migrated);
  }

  if (/\bstrategy\(/.test(migrated) && migrated.includes('brownie.test')) {
    migrated = `${migrated}\n# TODO: map remaining Brownie strategy(...) calls to hypothesis.strategies.\n`;
  }

  return migrated;
};

const eventListExpression = (receipt: string, eventName: string) => {
  return `[log for log in ${receipt}.events if log.event_name == "${eventName}"]`;
};

const replaceEventAccess = (source: string) => {
  return source
    .replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\.events\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]\[(\d+)\]\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g,
      (_match, receipt: string, eventName: string, index: string, fieldName: string) =>
        `${eventListExpression(receipt, eventName)}[${index}].event_arguments["${fieldName}"]`,
    )
    .replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\.events\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g,
      (_match, receipt: string, eventName: string) => eventListExpression(receipt, eventName),
    )
    .replace(
      /["']([A-Za-z_][A-Za-z0-9_]*)["']\s+in\s+([A-Za-z_][A-Za-z0-9_]*)\.events/g,
      (_match, eventName: string, receipt: string) => `any(log.event_name == "${eventName}" for log in ${receipt}.events)`,
    );
};

const replaceWeb3TestHelpers = (source: string) => {
  return source
    .replace(/\bweb3\.eth\.get_block\(["']latest["']\)\.timestamp\b/g, 'chain.blocks[-1].timestamp')
    .replace(/\bweb3\.eth\.get_block\(["']latest["']\)/g, 'chain.blocks[-1]')
    .replace(/\bweb3\.eth\.get_transaction_receipt\(([^)\n]+)\)/g, 'chain.get_receipt($1)')
    .replace(/\bweb3\.eth\.get_balance\(([^)\n]+)\)/g, 'chain.get_balance($1)');
};

// Ape's ape-test plugin supplies pytest fixtures such as accounts, chain, networks, and project.
// It also isolates tests by default and uses ape.reverts() for revert assertions.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();
  const hasTestingPattern = rootNode.findAll({ rule: { any: TESTING_PATTERNS } }).length > 0;
  const hasBrownieTestingSurface =
    source.includes('brownie.test') ||
    source.includes('fn_isolation') ||
    source.includes('module_isolation') ||
    source.includes('.events[');

  if (!hasTestingPattern && !hasBrownieTestingSurface) {
    return null;
  }

  let migrated = source;
  migrated = replaceBrownieReverts(migrated);
  migrated = removeIsolationFixtureParameters(migrated);
  migrated = replaceBrownieNetworkMarks(migrated);
  migrated = replaceHypothesisStrategies(migrated);
  migrated = replaceEventAccess(migrated);
  migrated = replaceWeb3TestHelpers(migrated);

  if (migrated !== source && /\bchain\./.test(migrated)) {
    migrated = ensureImport(migrated, 'from ape import chain');
  }

  return migrated === source ? null : migrated;
};

export default transform;
