# Combined Real-Repo Test Results

Primary target: https://github.com/smartcontractkit/chainlink-mix
Second target: https://github.com/PatrickAlphaC/brownie_simple_storage

Test date: 2026-04-25
Tester: rouma
Codemod: local `brownie-to-ape` workspace

## Commands Run

```bash
cd /tmp
git clone https://github.com/smartcontractkit/chainlink-mix.git chainlink-mix-brownie-to-ape-2
git clone https://github.com/PatrickAlphaC/brownie_simple_storage.git brownie-simple-storage-brownie-to-ape

cd /home/rouma/brownie-to-ape
npm install
npm test

npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/chainlink-mix-brownie-to-ape-2 --dry-run --allow-dirty
npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/brownie-simple-storage-brownie-to-ape --dry-run --allow-dirty

npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/chainlink-mix-brownie-to-ape-2 --allow-dirty
npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/brownie-simple-storage-brownie-to-ape --allow-dirty
```

## Diff Capture Commands

```bash
cd /tmp/chainlink-mix-brownie-to-ape-2
git diff --stat
git diff --shortstat
git diff -- scripts tests brownie-config.yaml > /tmp/chainlink-mix-brownie-to-ape.diff

cd /tmp/brownie-simple-storage-brownie-to-ape
git diff --stat
git diff --shortstat
git diff -- scripts tests brownie-config.yaml > /tmp/brownie-simple-storage-brownie-to-ape.diff
```

## Summary

| Repository | Files changed | Insertions | Deletions | Brownie patterns before | Brownie patterns after | Deterministic automation | AI-handled changes | Remaining manual work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `smartcontractkit/chainlink-mix` | 19 | 114 | 158 | 77 | 12 | 84.4% | 0.0% observed | 15.6% |
| `PatrickAlphaC/brownie_simple_storage` | 4 | 22 | 16 | 9 | 1 | 88.9% | 0.0% observed | 11.1% |
| Combined | 23 | 136 | 174 | 86 | 13 | 84.9% | 0.0% observed | 15.1% |

The AI edge-case step ran after all seven deterministic transforms. In these two repositories, no separate AI edits were observed; the guarded AI step remained available for ambiguous custom wrappers and heavy test mocking without making broad unrelated changes.

## Automation Coverage

| Category | Result | Notes |
| --- | --- | --- |
| Brownie imports | Mostly automated | Standard `from brownie import ...` imports migrated to `from ape import ...`; multiline custom imports in helpers still need review. |
| Accounts | Mostly automated | Local `accounts[0]` patterns migrated to Ape test accounts; private-key loading converted to `accounts.load(...)` with manual import guidance. |
| Contracts/deployments | Mostly automated | Project contract containers now use `project.ContractName.deploy(..., sender=account)`. |
| Networks/web3/chain | Mostly automated | `network.show_active()` converted to `networks.provider.network.name`; direct dynamic `web3.eth.contract` wrapper remains manual. |
| YAML config | Automated starter migration | Brownie config converted to Ape-style project metadata, Solidity config, remappings, and account-import TODOs. |
| Tests/reverts/events | Partially automated | Basic test deployments and senders migrated; event dictionary indexing still needs manual Ape receipt review in Chainlink VRF/API tests. |
| Scripts/CLI | Automated | Script deployment/read patterns migrated to Ape imports and project containers. |
| Custom wrappers | Partial | `helpful_scripts.py` contains dynamic contract and event filter wrappers that require human review. |

## Remaining Manual Review

- `chainlink-mix/scripts/helpful_scripts.py`: multiline Brownie import remains because it mixes Brownie project containers, `interface`, `config`, and legacy `web3` helpers.
- `chainlink-mix/scripts/helpful_scripts.py`: dynamic `web3.eth.contract(...).events[event].createFilter(...)` should be rewritten against documented Ape receipt/event APIs or preserved as a manual wrapper.
- `chainlink-mix/tests/test_api_consumer.py` and `tests/test_vrf_consumer.py`: event dictionary lookups such as `tx.events[0]["requestId"]` need review against Ape receipt event objects.
- `chainlink-mix/scripts/vrf_scripts/create_subscription.py`: still references `brownie-config.yaml` at runtime and should be manually moved to project data or Ape config.
- `brownie_simple_storage/tests/test_simple_storage.py`: leftover `import brownie.network as network` is unused after migration and should be removed.

## Verification Notes

- `npm test` passed in `/home/rouma/brownie-to-ape` before real-repo application.
- Both dry-runs completed successfully.
- Both apply runs completed successfully.
- No `TODO(brownie-to-ape)` markers were added by the AI step in these runs.
- Functional `ape compile` / `ape test` was not executed because these legacy Brownie examples have old dependency and environment assumptions; this pass measured codemod diff quality and Brownie API reduction.
