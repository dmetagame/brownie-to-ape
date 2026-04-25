# AI Edge Cases

This file defines the narrow scope for the final Codemod `ai` step. The seven JSSG transforms should do the predictable 80% of the Brownie to Ape migration first. The AI step is only for the remaining review-heavy cases where a safe rewrite needs local context.

Authoritative references:

- Ape docs: https://docs.apeworx.io/ape
- Ape accounts: https://docs.apeworx.io/ape/stable/userguides/accounts.html
- Ape contracts: https://docs.apeworx.io/ape/stable/userguides/contracts.html
- Ape networks: https://docs.apeworx.io/ape/stable/userguides/networks.html
- Ape scripts: https://docs.apeworx.io/ape/stable/userguides/scripts.html
- Ape testing: https://docs.apeworx.io/ape/latest/userguides/testing.html
- Brownie deprecation notice: https://github.com/eth-brownie/brownie#readme

## Should Touch

### Complex Deployment Scripts

Before:

```python
from brownie import accounts, network, project


def deploy(path, alias):
    loaded = project.load(path)
    deployer = accounts.load(alias)
    if network.show_active() != "mainnet":
        network.connect("mainnet")
    return loaded.Token.deploy({"from": deployer})
```

Safe AI behavior:

```python
from ape import Project, accounts, networks


def deploy(path, alias):
    loaded = Project(path)
    deployer = accounts.load(alias)
    if networks.provider.network.name != "mainnet":
        # TODO(brownie-to-ape): move deployment into an Ape mainnet provider context.
        return loaded.Token.deploy(sender=deployer)
    return loaded.Token.deploy(sender=deployer)
```

### Wrapper Classes Around Brownie Contracts

Before:

```python
from brownie import Contract


class TokenHandle:
    def __init__(self, address):
        self.contract = Contract.at(address)
```

Safe AI behavior:

```python
from ape import Contract


class TokenHandle:
    def __init__(self, address):
        self.contract = Contract(address)
```

### Brownie Event Dictionaries In Tests

Before:

```python
def test_transfer(token, owner, receiver):
    receipt = token.transfer(receiver, 1, {"from": owner})
    assert receipt.events["Transfer"][0]["to"] == receiver
```

Safe AI behavior:

```python
def test_transfer(token, owner, receiver):
    receipt = token.transfer(receiver, 1, sender=owner)
    transfers = [log for log in receipt.events if log.event_name == "Transfer"]
    assert transfers[0].event_arguments["to"] == receiver
```

### Unsupported Wrapper With A Clear Manual Boundary

Before:

```python
def fork_and_mine(rpc, seconds):
    rpc.sleep(seconds)
    rpc.mine(1)
```

Safe AI behavior:

```python
def fork_and_mine(rpc, seconds):
    # TODO(brownie-to-ape): replace Brownie rpc helper with documented Ape chain/provider helpers.
    rpc.sleep(seconds)
    rpc.mine(1)
```

## Should Not Touch

### Unrelated Refactors

Do not rename functions, reorder tests, format whole files, or rewrite deployment logic that does not reference Brownie.

### Ambiguous Account Ownership

Before:

```python
owner = get_owner_from_vault_or_env()
```

Do not guess whether this should become `accounts.load(...)`, `accounts.test_accounts[...]`, or a custom account class.

### Unknown Ape API

Do not invent calls such as:

```python
ape.deploy(...)
networks.connect(...)
accounts.add(...)
Contract.at(...)
receipt.events["Transfer"]
```

Use only documented Ape APIs. If the mapping is uncertain, leave a `TODO(brownie-to-ape)` comment instead.

### Mocks With Project Semantics

Before:

```python
mock_registry.patch_lookup("Token", fake_token)
```

Do not rewrite custom mocking or monkeypatching unless it directly references a documented Brownie API with a documented Ape replacement.

## Required AI Step Behavior

- Edit only Python and Brownie/Ape config YAML migration leftovers.
- Preserve addresses, constructor arguments, account aliases, environment variable names, gas values, test assertions, and deployment order.
- Prefer a small TODO over an unsafe rewrite.
- Do not touch generated files, lockfiles, Solidity contracts, package metadata, or documentation unrelated to the migration.
