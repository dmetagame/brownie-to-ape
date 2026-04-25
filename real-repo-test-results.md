# Real Repo Test Results

These smoke tests show the `brownie-to-ape` codemod running on two public Brownie projects. The results are suitable for README demos and hackathon submission material.

## Targets

| Repository | Why it matters |
| --- | --- |
| `smartcontractkit/chainlink-mix` | Covers Chainlink mocks, VRF/API scripts, config remappings, test fixtures, event assertions, and dynamic helper wrappers. |
| `PatrickAlphaC/brownie_simple_storage` | Covers the canonical Brownie beginner structure: deploy script, read script, config, tests, accounts, and local network branching. |

## Exact Commands

```bash
cd /tmp
git clone https://github.com/smartcontractkit/chainlink-mix.git chainlink-mix-brownie-to-ape-2
git clone https://github.com/PatrickAlphaC/brownie_simple_storage.git brownie-simple-storage-brownie-to-ape

cd /home/rouma/brownie-to-ape
npm install
npm test
```

Run dry-runs first:

```bash
cd /home/rouma/brownie-to-ape
npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/chainlink-mix-brownie-to-ape-2 --dry-run --allow-dirty
npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/brownie-simple-storage-brownie-to-ape --dry-run --allow-dirty
```

Apply to disposable clones:

```bash
cd /home/rouma/brownie-to-ape
npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/chainlink-mix-brownie-to-ape-2 --allow-dirty
npx codemod workflow run -w /home/rouma/brownie-to-ape/workflow.yaml --target /tmp/brownie-simple-storage-brownie-to-ape --allow-dirty
```

Capture review diffs:

```bash
cd /tmp/chainlink-mix-brownie-to-ape-2
git diff --stat
git diff -- scripts tests brownie-config.yaml > /tmp/chainlink-mix-brownie-to-ape.diff

cd /tmp/brownie-simple-storage-brownie-to-ape
git diff --stat
git diff -- scripts tests brownie-config.yaml > /tmp/brownie-simple-storage-brownie-to-ape.diff
```

## Metrics

| Repository | Total files changed | Deterministic transforms | AI step | Remaining manual work |
| --- | ---: | ---: | ---: | ---: |
| `smartcontractkit/chainlink-mix` | 19 | 84.4% | 0.0% observed | 15.6% |
| `PatrickAlphaC/brownie_simple_storage` | 4 | 88.9% | 0.0% observed | 11.1% |
| Combined | 23 | 84.9% | 0.0% observed | 15.1% |

Metric basis: measured Brownie-specific Python/YAML signatures before and after the workflow, excluding generated build artifacts. The combined run reduced tracked Brownie signatures from 86 to 13.

## Professional Before/After Examples

### Simple Storage Deploy Script

Before:

```python
from brownie import accounts, config, SimpleStorage, network

account = accounts[0]
simple_storage = SimpleStorage.deploy({"from": account})
transaction = simple_storage.store(15, {"from": account})
```

After:

```python
from ape import accounts, config, networks, project

account = accounts.test_accounts[0]
simple_storage = project.SimpleStorage.deploy(sender=account)
transaction = simple_storage.store(15, sender=account)
```

### Network Selection

Before:

```python
if network.show_active() == "development":
    account = accounts[0]
```

After:

```python
if networks.provider.network.name == "development":
    account = accounts.test_accounts[0]
```

### Chainlink Deployment Script

Before:

```python
from brownie import APIConsumer, config, network

job_id = config["networks"][network.show_active()]["jobId"]
api_consumer = APIConsumer.deploy(oracle, job_id, fee, link_token, {"from": account})
```

After:

```python
from ape import config, networks, project

job_id = config["networks"][networks.provider.network.name]["jobId"]
api_consumer = project.APIConsumer.deploy(oracle, job_id, fee, link_token, sender=account)
```

### Brownie Config

Before:

```yaml
compiler:
  solc:
    remappings:
      - "@chainlink=smartcontractkit/chainlink-brownie-contracts@0.6.1"
wallets:
  from_key: ${PRIVATE_KEY}
```

After:

```yaml
name: migrated-ape-project
plugins:
  - name: solidity
solidity:
  import_remapping:
    - "@chainlink=smartcontractkit/chainlink-brownie-contracts@0.6.1"
# TODO: Brownie `wallets.from_key` is intentionally not copied.
```

## Remaining Manual Work Under 20%

The remaining work is concentrated in dynamic code that a safe codemod should not guess:

- Dynamic helper imports and contract wrappers in `chainlink-mix/scripts/helpful_scripts.py`.
- Direct `web3.eth.contract(...).events[...]` filter construction.
- Event dictionary indexing that should be reviewed against Ape receipt event objects.
- Runtime mutation of `brownie-config.yaml` in subscription scripts.
- One unused `import brownie.network as network` in `brownie_simple_storage`.

## Demo Summary

The codemod successfully ran as a hybrid workflow on both repositories:

- Seven deterministic ast-grep transforms handled imports, accounts, deployments, networks, tests, scripts, and YAML config.
- The guarded AI step executed after deterministic transforms and did not make speculative edits in these smoke tests.
- Combined measured automation was 84.9%, keeping manual review at 15.1%.
- The output diffs are reviewable and concentrated in Brownie migration surfaces rather than unrelated style churn.

## Third Repo: PatrickAlphaC/brownie_fund_me

| Repository | Files changed | Brownie signatures before | Brownie signatures after | Automated | Remaining manual work |
| --- | --- | --- | --- | --- | --- |
| `PatrickAlphaC/brownie_fund_me` | 6 | 5 | 1 | 80.0% | 20.0% |

Remaining work: one multiline `from brownie import (MockV3Aggregator, network, ...)` in `scripts/deploy_mocks.py` was not fully removed — usages were migrated but the old import block needs manual cleanup. The `brownie-config.yaml` hit is a Chainlink package naming string (`chainlink-brownie-contracts`) and is not a migration failure.

## Updated Combined Metrics (All Three Repos)

| Repository | Files changed | Brownie signatures before | Brownie signatures after | Automated | Remaining |
| --- | --- | --- | --- | --- | --- |
| `smartcontractkit/chainlink-mix` | 19 | 77 | 12 | 84.4% | 15.6% |
| `PatrickAlphaC/brownie_simple_storage` | 4 | 9 | 1 | 88.9% | 11.1% |
| `PatrickAlphaC/brownie_fund_me` | 6 | 5 | 1 | 80.0% | 20.0% |
| **Combined** | **29** | **91** | **14** | **84.6%** | **15.4%** |
