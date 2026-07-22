# Contributing to NovaCont

Thank you for your interest in contributing to NovaCont.

NovaCont is a decentralized escrow protocol designed for secure, transparent, and programmable digital agreements. Contributions of all sizes are welcome, whether they involve smart contracts, documentation, testing, tooling, or developer experience.

Please read this guide before opening an Issue or Pull Request.

---

# Table of Contents

- Code of Conduct
- Ways to Contribute
- Before You Start
- Development Environment
- Repository Structure
- Development Workflow
- Branch Naming
- Commit Messages
- Coding Standards
- Solidity Guidelines
- Testing Requirements
- Security Guidelines
- Pull Requests
- Documentation
- Reporting Bugs
- Feature Requests
- Licensing

---

# Code of Conduct

By participating in this project, you agree to follow our Code of Conduct.

Please read:

CODE_OF_CONDUCT.md

---

# Ways to Contribute

You can contribute in many different ways, including:

- Smart contract development
- Security research
- Bug fixes
- Documentation improvements
- SDK improvements
- Test coverage
- Gas optimization
- Developer tooling
- Examples and tutorials

Not every contribution requires writing Solidity.

---

# Before You Start

Before starting work:

- Read the project README.
- Review the documentation.
- Search existing Issues before creating a new one.
- Open a discussion if the change is significant.

For larger architectural changes, please discuss the proposal before writing code.

---

# Development Environment

Clone the repository:

```bash
git clone https://github.com/NOVA-Cyber-Technology/NovaCont.git
cd NovaCont
```

Install dependencies:

```bash
npm install
```

Compile contracts:

```bash
npx hardhat compile
```

Run tests:

```bash
npx hardhat test
```

If the project migrates to another toolchain (such as Foundry), this document will be updated accordingly.

---

# Repository Structure

```
contracts/
docs/
sdk/
scripts/
test/
audits/
examples/
```

Please place new files in the appropriate directory.

---

# Development Workflow

1. Fork the repository.
2. Create a dedicated branch.
3. Make your changes.
4. Add or update tests.
5. Verify that all tests pass.
6. Open a Pull Request.

Keep Pull Requests focused on a single change whenever possible.

---

# Branch Naming

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

# Commit Messages

Follow clear and descriptive commit messages.

Examples:

```
feat: add dispute timeout validation

fix: prevent duplicate jury assignment

docs: update security documentation

test: improve escrow lifecycle coverage

refactor: simplify collateral calculations
```

Avoid messages such as:

```
update

fix

changes

test
```

---

# Coding Standards

General principles:

- Write readable code before clever code.
- Keep functions small and focused.
- Minimize duplicated logic.
- Prefer explicit naming over abbreviations.
- Document non-obvious behavior.

---

# Solidity Guidelines

Smart contract contributions should follow these principles:

- Follow the Checks-Effects-Interactions pattern where appropriate.
- Minimize external calls.
- Use custom errors instead of revert strings when practical.
- Emit events for important state changes.
- Prefer immutable variables where possible.
- Avoid unnecessary storage writes.
- Consider gas efficiency, but never sacrifice readability or security solely for optimization.

---

# Testing Requirements

Every smart contract change should include appropriate tests.

Tests should cover:

- Expected behavior
- Failure cases
- Permission checks
- Timeout logic
- State transitions
- Edge cases

Pull Requests introducing new functionality without tests may be declined.

---

# Security Guidelines

Security takes priority over new features.

Please:

- Never submit code that intentionally weakens protocol security.
- Clearly explain security implications of your changes.
- Avoid introducing unnecessary trust assumptions.
- Preserve deterministic contract behavior.

If your contribution changes protocol security assumptions, describe those changes explicitly in the Pull Request.

For reporting vulnerabilities, see:

SECURITY.md

---

# Pull Requests

Before submitting a Pull Request, ensure that:

- All tests pass.
- Code compiles successfully.
- Documentation has been updated where necessary.
- No unrelated changes are included.
- Commit history is reasonably clean.

Reviewers may request additional changes before merging.

---

# Documentation

Documentation is considered part of the project.

If your Pull Request changes:

- contract behavior
- public APIs
- deployment
- configuration
- protocol rules

please update the relevant documentation.

---

# Reporting Bugs

Use GitHub Issues for:

- Bugs
- Documentation problems
- Feature requests

Security vulnerabilities should **not** be reported publicly.

Please follow the process described in:

SECURITY.md

---

# Feature Requests

Feature requests should explain:

- The problem being solved.
- Why the feature is useful.
- Possible implementation ideas (optional).

Acceptance of feature requests is at the discretion of the maintainers.

---

# Licensing

NovaCont is licensed under the PolyForm Shield License 1.0.0, a source-available license, not a standard open source license. You may read, audit, and build on this code for non-competing purposes, but the license does not permit using it to build or ship a competing escrow product or service.

By submitting code, documentation, or other contributions, you agree that your contribution will be licensed under these same terms.

Please review:

LICENSE

before contributing.

---

Thank you for helping build NovaCont.

Every contribution helps improve the protocol for developers, researchers, and users around the world.
