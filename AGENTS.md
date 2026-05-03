## Git Workflow

- Never push directly to main
- Always create a feature branch
- Branch naming: feature/<task-name>, fix/<issue>, or chore/<task-name>
- Always open a PR and wait for CI to pass
- Do not merge your own PRs
- Open PRs in ready for review state (Open) not draft

## Changesets

Run `npm test` and `npm run typecheck` before requesting review. Fix failures locally first; do not rely on CI to catch regressions you can reproduce with a clean checkout.
