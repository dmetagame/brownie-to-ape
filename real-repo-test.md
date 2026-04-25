# Real Repo Test Plan

Use this plan to test `brownie-to-ape` against real Brownie repositories before publishing. Run every test in a disposable clone or branch.

## Candidate Repositories

These repositories currently expose Brownie project structure such as `brownie-config.yaml`, `scripts/`, `tests/`, or README instructions using `brownie run` / `brownie test`.

- `smartcontractkit/chainlink-mix`: https://github.com/smartcontractkit/chainlink-mix
  - Good coverage for Chainlink mocks, Brownie scripts, testnet/mainnet-fork docs, `brownie-config.yaml`, and Brownie test patterns.
- `PatrickAlphaC/smartcontract-lottery`: https://github.com/PatrickAlphaC/smartcontract-lottery
  - Archived but useful coverage for `Contract.from_abi`, interfaces, mocks, event assertions, and VRF-style scripts.
- `kryptify/yearn-finance-strategy`: https://github.com/kryptify/yearn-finance-strategy
  - Good coverage for Yearn strategy patterns, `brownie-config.yml`, fork-based tests, custom helpers, and DeFi contract wrappers.

Optional additional smoke target:

- `PatrickAlphaC/brownie_fund_me`: https://github.com/PatrickAlphaC/brownie_fund_me
  - Small project with standard Brownie deploy/test/config patterns.

## One-Time Setup

```bash
cd /tmp
git clone https://github.com/smartcontractkit/chainlink-mix.git
git clone https://github.com/PatrickAlphaC/smartcontract-lottery.git
git clone https://github.com/kryptify/yearn-finance-strategy.git
cd /home/rouma/brownie-to-ape
npm install
npm test
```

## Dry-Run On Each Repo

```bash
cd /home/rouma/brownie-to-ape
npx codemod workflow run -w workflow.yaml --target /tmp/chainlink-mix --dry-run --allow-dirty
npx codemod workflow run -w workflow.yaml --target /tmp/smartcontract-lottery --dry-run --allow-dirty
npx codemod workflow run -w workflow.yaml --target /tmp/yearn-finance-strategy --dry-run --allow-dirty
```

Review the printed diff for:

- Brownie imports converted to Ape imports without duplicate or contradictory imports.
- `accounts[0]` converted only where local/test-account intent is clear.
- `accounts.add(...)` left with a manual account-import TODO instead of copying secrets.
- `Contract.at(...)`, `Contract.from_abi(...)`, interfaces, and deploy calls converted conservatively.
- Brownie event dictionaries converted to receipt event iteration only when the event shape is obvious.
- `brownie-config.yaml` / `brownie-config.yml` rewritten to a plausible `ape-config.yaml` body.
- AI TODO comments only on genuinely ambiguous edge cases.

## Apply On A Disposable Branch

```bash
cd /tmp/chainlink-mix
git checkout -b rouma/brownie-to-ape-smoke
cd /home/rouma/brownie-to-ape
npx codemod workflow run -w workflow.yaml --target /tmp/chainlink-mix --allow-dirty
cd /tmp/chainlink-mix
git diff --stat
git diff -- scripts tests brownie-config.yaml
```

Repeat for the other repositories.

## Manual Verification Checklist

- No private key values were introduced.
- No Solidity contracts were modified unless explicitly intended.
- No generated build artifacts or lockfiles changed.
- Every remaining Brownie API either has a documented Ape replacement or a `TODO(brownie-to-ape)` comment.
- The diff is split into deterministic changes first and AI edge-case cleanup last.

## Optional Functional Checks

Only run these if the target repo dependencies still install cleanly:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
ape compile
ape test
```

If dependency installation fails because the Brownie repo is archived or pinned to old networks/tooling, record the failure and keep the codemod validation focused on diff quality.
