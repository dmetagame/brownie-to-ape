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
- Fixture-driven validation with 16 before/after pairs
- Real-repo smoke testing on public Brownie projects

## 80%+ Automation Proof

The codemod was tested on two real Brownie repositories. Measured Brownie-specific Python/YAML signatures dropped from 86 to 13 across both repos, excluding generated build artifacts.

| Repository | Files changed | Brownie patterns before | Brownie patterns after | Automated | Remaining manual work |
| --- | ---: | ---: | ---: | ---: | ---: |
| `smartcontractkit/chainlink-mix` | 19 | 77 | 12 | 84.4% | 15.6% |
| `PatrickAlphaC/brownie_simple_storage` | 4 | 9 | 1 | 88.9% | 11.1% |
| Combined | 23 | 86 | 13 | 84.9% | 15.1% |

The AI step ran after deterministic transforms and made no speculative edits in these smoke tests. That is the intended behavior: deterministic transforms handled the documented patterns, while unresolved dynamic wrappers and event dictionary usage remained visible for review.

## Real-Repo Results

- `chainlink-mix`: migrated imports, deploy calls, network lookups, sender transaction kwargs, test deployment patterns, and Brownie config remappings across scripts and tests.
- `brownie_simple_storage`: migrated the canonical deploy/test/config flow, including `SimpleStorage.deploy(...)`, `accounts[0]`, `accounts.add(...)`, and `network.show_active()`.
- Remaining manual work stayed below 20% and was concentrated in dynamic helper wrappers, event receipt shape review, runtime config mutation, and one unused Brownie import.

## Why It Is Submission-Ready

- `npm test` passes.
- `workflow.yaml` validates with Codemod.
- 16 fixture pairs cover imports, accounts, contracts, networks, config, tests, scripts, custom wrappers, and CLI patterns.
- README includes one-command usage, real metrics, before/after diffs, screenshots/diff placeholders, and publish instructions.
- Registry metadata is configured for public publishing.
