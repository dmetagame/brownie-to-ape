import { type Transform } from 'codemod:ast-grep';
import type Python from 'codemod:ast-grep/langs/python';

const ACCOUNT_PATTERNS = [
  { pattern: 'accounts[$INDEX]' },
  { pattern: 'accounts.add()' },
  { pattern: 'accounts.add($PRIVATE_KEY)' },
  { pattern: 'Account.from_key($PRIVATE_KEY)' },
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

const hasRootAccountsImport = (source: string) => {
  return /^from\s+(?:ape|brownie)\s+import\s+.*\baccounts\b/m.test(source);
};

const hasAccountsFixtureParameter = (source: string) => {
  return /\bdef\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*\baccounts\b[^)]*\)\s*:/.test(source);
};

const replaceRootAccountIndexing = (source: string) => {
  if (!hasRootAccountsImport(source) || hasAccountsFixtureParameter(source)) {
    return source;
  }

  // Brownie scripts commonly use `accounts[0]` from the imported account manager.
  // Ape docs use `accounts.test_accounts[0]` for the same pre-funded accounts outside tests.
  return source.replace(/(?<![\w.])accounts\[(\d+|[A-Za-z_][A-Za-z0-9_]*)\]/g, 'accounts.test_accounts[$1]');
};

const replacePrivateKeyAccountConstruction = (source: string) => {
  let migrated = source;

  migrated = migrated.replace(
    /(?<![\w.])accounts\.add\(\s*\)/g,
    'accounts.test_accounts.generate_test_account()',
  );

  migrated = migrated.replace(
    /(?<![\w.])accounts\.add\(([^)\n]+)\)/g,
    'accounts.load("migrated-account")  # TODO: import $1 with `ape accounts import migrated-account`',
  );

  migrated = migrated.replace(
    /(?<![\w.])Account\.from_key\(([^)\n]+)\)/g,
    'accounts.load("migrated-account")  # TODO: import $1 with `ape accounts import migrated-account`',
  );

  if (migrated !== source) {
    migrated = ensureApeImport(migrated, 'accounts');
    migrated = migrated.replace(
      /^from\s+brownie(?:\.network\.account)?\s+import\s+Account\s*$/m,
      'from ape import accounts',
    );
  }

  return migrated;
};

const replaceLocalAccountTypeHints = (source: string) => {
  return source
    .replace(/^from\s+brownie\.network\.account\s+import\s+LocalAccount\s*$/m, 'from ape.api import AccountAPI')
    .replace(/\bLocalAccount\b/g, 'AccountAPI');
};

// Ape account loading is documented at https://docs.apeworx.io/ape/stable/userguides/accounts.html.
// The transform avoids test functions that already use Ape's `accounts` pytest fixture.
const transform: Transform<Python> = async (root) => {
  const rootNode = root.root();
  const hasAccountPattern = rootNode.findAll({ rule: { any: ACCOUNT_PATTERNS } }).length > 0;
  const source = rootNode.text();

  if (!hasAccountPattern && !source.includes('LocalAccount')) {
    return null;
  }

  let migrated = source;
  migrated = replaceRootAccountIndexing(migrated);
  migrated = replacePrivateKeyAccountConstruction(migrated);
  migrated = replaceLocalAccountTypeHints(migrated);

  return migrated === source ? null : migrated;
};

export default transform;
