# Hackathon Submission Summary

## Title

`brownie-to-ape`: Hybrid AST + AI Codemod for Brownie to Ape Framework migration

## Description

`brownie-to-ape` is a production-grade Codemod package that migrates legacy Brownie Ethereum Python projects to Ape Framework. Brownie is no longer actively maintained, while Ape is the actively documented Python Ethereum framework recommended by the Brownie README. This project makes the migration repeatable by combining seven deterministic `jssg` / ast-grep transforms with one tightly constrained Codemod AI cleanup step.

## Impact

Many Ethereum Python repositories still depend on Brownie imports, deployment scripts, account helpers, test fixtures, network checks, `web3.py` wrappers, and `brownie-config.yaml`. Manual migration is tedious and risky because the same patterns appear across scripts, tests, and config. `brownie-to-ape` automates the common majority of the work, produces reviewable diffs, and leaves ambiguous project-specific code for targeted review instead of guessing.

## Tech Stack

- Codemod Workflows
- `jssg` with `codemod:ast-grep`
- TypeScript transforms
- ast-grep Python parser
- ast-grep YAML parser
- Codemod built-in AI step
- Ape Framework migration mappings
- Fixture-driven validation with 17 before/after pairs and 13 executable jssg snapshot cases
- Real-repo smoke testing on public Brownie projects

## 80%+ Automation Proof

The codemod was tested on three real Brownie repositories. Measured Brownie-specific Python/YAML signatures dropped from 91 to 9 across all three repos, excluding generated build artifacts.

| Repository | Files changed | Brownie patterns before | Brownie patterns after | Automated | Remaining manual work |
| --- | ---: | ---: | ---: | ---: | ---: |
| `smartcontractkit/chainlink-mix` | 19 | 77 | 8 | 89.6% | 10.4% |
| `PatrickAlphaC/brownie_simple_storage` | 4 | 9 | 0 | 100.0% | 0.0% |
| `PatrickAlphaC/brownie_fund_me` | 6 | 5 | 1 | 80.0% | 20.0% |
| Combined | 29 | 91 | 9 | 90.1% | 9.9% |

The AI step ran after deterministic transforms and made no speculative edits in these smoke tests. That is the intended behavior: deterministic transforms handled the documented patterns, while unresolved dynamic wrappers, Brownie-only conversion helpers, and legacy `web3.eth.contract(...)` event filters remained visible for review.

## Real-Repo Results

- `chainlink-mix`: migrated imports, deploy calls, network lookups, sender transaction kwargs, test deployment patterns, and Brownie config remappings across scripts and tests.
- `brownie_simple_storage`: migrated the canonical deploy/test/config flow, including `SimpleStorage.deploy(...)`, `accounts[0]`, `accounts.add(...)`, and `network.show_active()`.
- `brownie_fund_me`: migrated deploy scripts, mock deployment helpers, tests, config, transaction dictionaries, and local test-account generation.
- Remaining manual work stayed at 9.9% combined and was concentrated in dynamic helper wrappers, legacy web3 event filters, Brownie-only conversion helpers, and project-specific exception handling.

## Why It Is Submission-Ready

- `npm test` passes.
- `workflow.yaml` validates with Codemod.
- 17 fixture pairs and 13 executable jssg snapshot cases cover imports, accounts, contracts, networks, config, tests, scripts, custom wrappers, and CLI patterns.
- README includes one-command usage, real metrics, before/after diffs, screenshots/diff placeholders, and publish instructions.
- Registry metadata is configured for public publishing.
