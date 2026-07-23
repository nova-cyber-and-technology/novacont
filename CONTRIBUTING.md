# Contributing to NovaCont

Thank you for your interest in contributing to NovaCont.

NovaCont is a decentralized escrow protocol for secure, transparent, and programmable digital agreements. Contributions of all sizes are welcome, whether they involve smart contracts, documentation, the SDK, or developer experience.

Please read this guide before opening an Issue or Pull Request.

---

## Table of Contents

- Code of Conduct
- Ways to Contribute
- Before You Start
- Repository Structure
- Development Environment
- Development Workflow
- Branch Naming
- Commit Messages
- Coding Standards
- Solidity Guidelines
- Testing
- Security Guidelines
- Pull Requests
- Documentation
- Reporting Bugs
- Feature Requests
- Licensing

---

## Code of Conduct

By participating in this project, you agree to follow our Code of Conduct.

See: [CODE_OF_CONDUCT.md](https://github.com/nova-cyber-and-technology/.github/blob/main/CODE_OF_CONDUCT.md) (org-wide)

---

## Ways to Contribute

You can contribute in many ways:

- Smart contract improvements
- Security research and responsible disclosure
- SDK improvements and integration examples
- Documentation improvements
- Gas optimization
- Developer tooling

Not every contribution requires writing Solidity.

---

## Before You Start

Before starting work:

- Read the project README.
- Review the documentation at https://novacont.gitbook.io/nova-docs
- Search existing Issues before creating a new one.
- Open a discussion first for larger architectural changes, we'd rather talk through the direction before you invest time in code.

---

## Repository Structure

```
contracts/   Solidity smart contracts (NovaCont.sol)
sdk/         TypeScript SDK for integrating with NovaCont
```

Additional directories (documentation, tests, deployment scripts) will be added as they're built out. Please open an Issue before creating a new top-level directory.

---

## Development Environment

The two parts of the repo have separate toolchains, treat them independently.

### SDK (`sdk/`)

```bash
cd sdk
npm install
npm run typecheck
npm run build
npm test
```

Details in [`sdk/README.md`](./sdk/README.md).

### Contracts (`contracts/`)

The contracts have been deployed and are live, but a public build/test setup isn't published in this repo yet. If you're planning to work on the Solidity side, please open an Issue first so we can coordinate on toolchain (Hardhat / Foundry), test fixtures, and how you can reproduce a clean local build.

---

## Development Workflow

1. Fork the repository.
2. Create a dedicated branch.
3. Make your changes.
4. Verify that the SDK still typechecks and builds (`npm run typecheck` and `npm run build` inside `sdk/`).
5. Open a Pull Request.

Keep Pull Requests focused on a single change whenever possible; smaller PRs are easier to review and merge.

---

## Branch Naming

Examples:

```
feature/add-juror-staking
feature/usdt-support

fix/reentrancy-check
fix/documentation-links

docs/update-readme

refactor/fee-manager

test/dispute-lifecycle
```

---

## Commit Messages

Clear, descriptive commit messages:

```
feat: add dispute timeout validation
fix: prevent duplicate jury assignment
docs: update security documentation
refactor: simplify collateral calculations
```

Avoid vague messages like `update`, `fix`, `changes`, `test`.

---

## Coding Standards

- Readable code before clever code.
- Small, focused functions.
- Minimal duplicated logic.
- Explicit naming over abbreviations.
- Document non-obvious behavior with a comment; don't document the obvious.

---

## Solidity Guidelines

For smart contract contributions:

- Follow the Checks-Effects-Interactions pattern where appropriate.
- Minimize external calls.
- Emit events for important state changes.
- Prefer immutable variables where possible.
- Avoid unnecessary storage writes.
- Consider gas efficiency, but never sacrifice readability or security solely for optimization.
- Match the existing style of the contract you're editing. The current codebase uses `require(condition, "string")` for reverts rather than custom errors; if you'd like to migrate a section to custom errors, open an Issue to discuss it as a separate change, don't mix styles inside a single PR.

---

## Testing

A public test suite isn't in this repository yet. Static analysis has been run (Slither, results published in the docs), but unit/integration tests are still being organized for public release.

If you're contributing code:

- For SDK changes, add or update tests under `sdk/test/` where practical.
- For contract changes, describe how you verified the change in the PR (local fork, testnet transaction, etc.), and be prepared to help set up a shared test fixture as part of the PR discussion.

This will get stricter as the test infrastructure matures. We won't reject a PR for missing tests that we don't yet require of ourselves.

---

## Security Guidelines

Security takes priority over new features.

- Never submit code that intentionally weakens protocol security.
- Explain security implications of your changes clearly in the PR.
- Avoid introducing unnecessary trust assumptions.
- Preserve deterministic contract behavior.

For reporting vulnerabilities, see [SECURITY.md](./SECURITY.md); do not open a public Issue for a suspected vulnerability.

---

## Pull Requests

Before submitting:

- SDK: `npm run typecheck` and `npm run build` pass inside `sdk/`.
- Contract changes: describe how you verified them.
- Documentation is updated where relevant.
- No unrelated changes bundled in.
- Commit history is reasonably clean.

Reviewers may request changes before merging.

---

## Documentation

Documentation is part of the project. If your PR changes:

- contract behavior
- SDK public APIs
- deployment
- configuration
- protocol rules

please update the relevant documentation in the same PR. In-repo docs (README, SECURITY, this file) go in the PR itself; user-facing GitBook docs at https://novacont.gitbook.io/nova-docs are updated separately, note in the PR if a GitBook update is also needed.

---

## Reporting Bugs

Use GitHub Issues for bugs, documentation problems, and feature requests.

Security vulnerabilities should **not** be reported publicly. Follow the process in [SECURITY.md](./SECURITY.md).

---

## Feature Requests

Feature requests should explain:

- The problem being solved.
- Why the feature is useful.
- Possible implementation ideas (optional).

Acceptance is at the maintainers' discretion; a well-scoped Issue is much more likely to move forward than an unbounded proposal.

---

## Licensing

NovaCont is licensed under the PolyForm Shield License 1.0.0, a source-available license, not a standard open source license. You may read, audit, and build on this code for non-competing purposes, but the license does not permit using it to build or ship a competing escrow product or service.

By submitting code, documentation, or other contributions, you agree that your contribution will be licensed under these same terms.

Please review [LICENSE](./LICENSE) before contributing.

The SDK (`sdk/`) is licensed separately under MIT, see `sdk/LICENSE`.

---

Thank you for helping build NovaCont.
