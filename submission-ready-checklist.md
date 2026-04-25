# Submission-Ready Checklist

Use this checklist immediately before hackathon submission and Codemod Registry publishing.

## Project Status

- [x] README includes one-command usage, real-repo metrics, before/after diffs, screenshots/diff placeholders, and references.
- [x] Hackathon one-page summary is present in `HACKATHON-SUBMISSION.md`.
- [x] Registry metadata is present in `.codemod/config.json` and `codemod.yaml`.
- [x] Workflow uses seven deterministic `jssg` / ast-grep transforms before one AI step.
- [x] Fixture suite includes 16 before/after pairs across Python and YAML.
- [x] Real-repo smoke results are recorded in `real-repo-test-results.md` and `test-results-chainlink-mix.md`.

## Final Local Validation

Run from the project root:

```bash
cd /home/rouma/brownie-to-ape
npm install
npm test
npx codemod workflow validate -w workflow.yaml
```

Expected result:

```text
✅ Workflow definition is valid
ok: 16 fixture pairs
```

## Optional Real-Repo Demo Check

Use a disposable clone:

```bash
cd /tmp
git clone https://github.com/PatrickAlphaC/brownie_simple_storage.git brownie-simple-storage-demo
cd /home/rouma/brownie-to-ape
npx codemod workflow run -w workflow.yaml --target /tmp/brownie-simple-storage-demo --dry-run --allow-dirty
```

Apply only after reviewing the dry-run diff:

```bash
npx codemod workflow run -w workflow.yaml --target /tmp/brownie-simple-storage-demo --allow-dirty
cd /tmp/brownie-simple-storage-demo
git diff --stat
```

## Publish Commands

Authenticate with Codemod:

```bash
cd /home/rouma/brownie-to-ape
npx codemod login
```

Or authenticate non-interactively with an API key:

```bash
cd /home/rouma/brownie-to-ape
npx codemod login --api-key "$CODEMOD_API_KEY"
```

Publish to the Codemod Registry:

```bash
cd /home/rouma/brownie-to-ape
npx codemod publish . --verbose
```

Equivalent npm script:

```bash
cd /home/rouma/brownie-to-ape
npm run publish:codemod
```

## Optional GitHub Action

The publish-action template is stored at `docs/github-workflows/publish.yml`.
Move it to `.github/workflows/publish.yml` only when your GitHub token has the
`workflow` scope, then tag the release:

```bash
cd /home/rouma/brownie-to-ape
git tag brownie-to-ape@v0.1.0
git push origin brownie-to-ape@v0.1.0
```

The workflow publishes the root codemod package after `npm ci` and `npm test`.

## Submission Assets

- README: `README.md`
- One-page summary: `HACKATHON-SUBMISSION.md`
- Real-repo metrics: `real-repo-test-results.md`
- Chainlink smoke test detail: `test-results-chainlink-mix.md`
- AI safety prompt and examples: `src/ai-edge-cases.md`
- Optional GitHub Actions publish template: `docs/github-workflows/publish.yml`
- Workflow: `workflow.yaml`
- Registry metadata: `.codemod/config.json`, `codemod.yaml`

## Final Review

- [x] Repository URL is set to `https://github.com/dmetagame/brownie-to-ape` in `package.json`, `codemod.yaml`, and `.codemod/config.json`.
- [ ] Capture screenshots for the placeholders listed in README.
- [ ] Confirm Codemod account or organization scope before publishing.
- [ ] Run `npm test` after any last-minute copy edits.
- [ ] Publish with `npx codemod publish . --verbose`.
