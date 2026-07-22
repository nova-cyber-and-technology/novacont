<div align="center">

# NovaCont

**A non-custodial escrow protocol for digital services and online agreements.**

Programmable settlement. Deterministic timeouts. No custodian, ever.

[![License: PolyForm Shield 1.0.0](https://img.shields.io/badge/license-PolyForm%20Shield%201.0.0-blue.svg)](./LICENSE.md)
[![Network: Base](https://img.shields.io/badge/network-Base-0052FF.svg)](https://base.org)
[![Status: Mainnet Live](https://img.shields.io/badge/status-mainnet%20live-brightgreen.svg)](#project-status)
[![Audit: Unaudited](https://img.shields.io/badge/audit-unaudited-orange.svg)](#security-model)

[Documentation](https://docs.novatechnology.app) · [Security](./SECURITY.md) · [Contributing](./CONTRIBUTING.md)

</div>

---

## Project Status

NovaCont's core escrow contract is **live on Base mainnet and Base Sepolia testnet**, and has been operating for a while. `NovaJury`, the decentralized dispute resolution layer, is deployed but **not yet active**: disputes are currently resolved by a designated administrator (see [Security Model](#security-model)) until an established juror pool exists to take over. The contracts have **not yet completed a formal third-party audit** — read that section before committing significant funds.

---

## Overview

NovaCont lets two parties, a client and a provider, enter a binding on-chain agreement without a centralized intermediary holding their money. Funds are locked directly in a smart contract at the moment of confirmation. From that point forward, no individual, company, or entity, including NOVA, can unilaterally move, freeze, or redirect them. The contract releases funds only when one of a fixed set of on-chain conditions is met: approval, cancellation, timeout, or dispute resolution.

This is a **non-custodial**, trust-minimized protocol, not a trustless one in the absolute sense: today, disputes are mediated by an administrator with narrowly scoped emergency powers, while fund custody itself is fully autonomous from day one. That distinction matters and we'd rather state it plainly than round it up. See [NovaJury](#novajury) for how dispute resolution decentralizes over time.

---

## Why NovaCont

Traditional escrow relies on a trusted intermediary who holds funds, adjudicates disagreements, and can, in principle, act against either party's interest. NovaCont narrows that surface area:

- **Custody is removed from the equation.** Funds sit in a smart contract, not a company's balance sheet or bank account.
- **Settlement rules are fixed in advance.** Neither party can unilaterally change the terms once funds are locked.
- **Every exit path is defined.** Timeouts guarantee that funds are never held hostage by an unresponsive or bad-faith counterparty.
- **State is public and verifiable.** Anyone can inspect a contract's balance, status, and history on-chain.

---

## Core Principles

- **Non-custodial by design.** NovaCont never takes custody of user funds, not even temporarily.
- **Deterministic settlement.** Every state transition and its outcome is defined in the contract logic, not decided case-by-case.
- **No path to permanently stuck funds.** Every state in the contract lifecycle has a defined exit, enforced by timeout, not by a promise.
- **Progressive decentralization.** Dispute resolution starts administrator-mediated and hands off to `NovaJury` as the juror pool matures, it doesn't claim to be fully decentralized before it is.
- **Transparency over reassurance.** Where a limitation exists (unaudited contracts, admin-mediated disputes today), it's documented, not smoothed over.

---

## Key Features

- Non-custodial escrow with on-chain fund locking
- Adaptive collateral for low-value agreements (see [below](#adaptive-collateral))
- Oracle-based live pricing via Chainlink for ETH-denominated agreements
- Multi-token support (ETH and USDT)
- Deterministic, timeout-driven state transitions, no agreement can stall indefinitely
- `NovaJury` decentralized dispute resolution (rolling out, see [status](#novajury))
- Deployed on Base, an Ethereum L2, keeping gas costs a fraction of a cent
- Source-available, publicly verifiable smart contracts

---

## Architecture

```
                  Client                      Provider
                     │                            │
                     ▼                            ▼
            ┌───────────────────────────────────────────┐
            │           NovaCont Smart Contract          │
            │   (escrow lifecycle, timeouts, settlement) │
            └───────────────────┬────────────────────────┘
                                 │
                    disputed?    │    no dispute
                        ┌────────┴────────┐
                        ▼                 ▼
                  ┌───────────┐     ┌────────────┐
                  │ NovaJury  │     │ Settlement │
                  │ (pending) │     │  (payout)  │
                  └───────────┘     └────────────┘
```

`NovaCont` owns the full escrow lifecycle: it locks funds, tracks deadlines, and executes settlement. Pricing for ETH-denominated agreements is read live from a Chainlink oracle at contract creation. When a dispute is opened, resolution currently routes through an administrator; once `NovaJury` is active, it routes there instead, same contract, same guarantees, different resolver.

---

## Escrow Lifecycle

```
Created → Pending Approval → In Progress → Under Review → Completed
                │                   │             │
                ├─ Provider Reject  ├─ Cancel      ├─ Dispute Opened
                └─ Accept Timeout   └─ (split rule │
                   → Refunded          after 50%   ▼
                                       elapsed)   Dispute Resolution
```

- **Created → Pending Approval**: the client locks funds against a provider-defined proposal. The provider has a defined window to accept or reject.
- **Pending Approval → In Progress**: the provider accepts; the delivery countdown starts from this moment, not from funding.
- **In Progress → Under Review**: the provider submits an evidence URI referencing the completed work. The client's 7-day review window starts immediately.
- **Under Review → Completed**: the client approves (or the 7-day timeout elapses), payment minus the 3% platform fee is released to the provider automatically.
- **Under Review → Disputed**: the client opens a dispute instead of approving; resolution proceeds via the current administrator or `NovaJury`.
- **Cancellation**: available before acceptance (full refund) and after acceptance but before delivery (the provider is entitled to 50% of the base price if more than half the delivery window has elapsed, the rest returns to the client).

Every branch terminates. There is no reachable state where funds have no defined path out.

---

## Repository Structure

```
contracts/   Solidity smart contracts
docs/        Technical documentation
sdk/         Client SDK
scripts/     Deployment and utility scripts
test/        Contract test suite
audits/      Audit reports (as they become available)
examples/    Usage examples
```

---

## Getting Started

```bash
git clone https://github.com/<org>/novacont.git
cd novacont
npm install
npx hardhat compile
npx hardhat test
```

> The commands above assume a Hardhat-based setup. If this repository uses a different toolchain, replace them with the actual build/test commands before publishing, they should match exactly what's in `package.json` / `foundry.toml`.

For local deployment and testnet configuration, see the setup guide in [`docs/`](./docs).

---

## Quick Example

The snippet below illustrates the interaction shape conceptually. It is **not a verified interface**, check [`sdk/`](./sdk) and the [documentation](https://docs.novatechnology.app) for exact method signatures before integrating.

```solidity
// Illustrative only, confirm exact signatures in /sdk and the docs.
INovaCont novacont = INovaCont(NOVACONT_ADDRESS);

// Provider generates a proposal off-chain; client funds it on-chain.
novacont.acceptProposal{value: depositAmount}(proposalId);

// Provider submits completed work.
novacont.submitDelivery(agreementId, evidenceURI);

// Client approves, or lets the 7-day timeout release payment automatically.
novacont.approveDelivery(agreementId);
```

---

## Development

Development workflow, branch naming, and coding standards are documented in [CONTRIBUTING.md](./CONTRIBUTING.md). Smart contract changes go through a stricter review process than other changes, given what's at stake, see the "Smart Contract Changes" section there before opening a PR.

---

## Security Model

- **Non-custodial by construction.** Locked funds live at the contract address, not in any NOVA-controlled wallet, account, or database.
- **Bounded admin powers.** The contract owner retains limited emergency capabilities (such as pausing the contract or force-cancelling an agreement), but every one of those paths resolves to a full client refund. There is no admin path that redirects funds to NOVA or any third party.
- **Independent of NovaCont's servers.** If the NovaCont platform interface went offline entirely, the deployed contracts would keep functioning; users could still interact with them directly through a block explorer or any compatible interface.
- **Unaudited today.** No formal third-party audit has been completed yet. Audit reports will be published under [`audits/`](./audits) as they're completed. Treat mainnet contracts as unaudited and size funds accordingly until then.

Found a vulnerability? Don't open a public Issue, follow [SECURITY.md](./SECURITY.md).

---

## NovaJury

`NovaJury` is the protocol's decentralized dispute resolution layer, deployed but **not yet active**.

- **Today**: disputes are resolved in administered mode, a designated administrator reviews evidence and determines the outcome.
- **Becoming a juror**: any wallet can register as a juror by staking a minimum of 500 USDT, no identity checks, no application process.
- **Fee distribution**: dispute fees collected from both parties flow into the `NovaJury` contract's own balance, never NovaCont's. 70% is split among the jurors who voted on a case; 30% is retained as a protocol contribution.
- **Finality**: jury verdicts execute automatically on-chain once a majority is reached and cannot be appealed. Bring complete evidence the first time.
- **Activation**: `NovaJury` switches on once a sufficient juror pool is established, it isn't gated on a date, it's gated on having enough independent jurors that resolution is meaningfully decentralized rather than nominally so.

---

## Adaptive Collateral

Agreement size changes how much the client locks, because the incentive to act in bad faith doesn't scale evenly with contract value.

- **Agreements ≥ $200**: the client deposits exactly the agreed base price. Standard 1x collateral.
- **Agreements < $200**: the client deposits **1.25x** the base price. The extra 25% is a refundable trust buffer, it is never paid to the provider and returns to the client in full on successful completion.

The buffer exists because at low contract values, the cost of walking away or acting dishonestly is otherwise disproportionately small relative to the effort of resolving a dispute. Requiring extra skin in the game closes that gap without touching the fee structure.

---

## Fee Model

| Action | Fee | Paid By | Goes To |
|---|---|---|---|
| Creating a contract | Gas only | Client | Network |
| Accepting a proposal | Gas only | Provider | Network |
| Submitting deliverables | Gas only | Provider | Network |
| Approving work | Gas only | Client | Network |
| Platform settlement fee | 3% of agreed price | Deducted from provider payment | NOVA |
| Extra deposit (agreements < $200) | None, fully refundable | Client | Returned to client |
| Opening a dispute | 5% of contract value (min 1 USDT, max 25 USDT) + gas | Initiating party | `NovaJury` contract balance |

The 3% platform fee applies only to successfully completed agreements and is calculated on the base price alone, never on the adaptive collateral buffer. It's charged the same way regardless of whether settlement happens via approval, timeout, or dispute resolution, and it is non-refundable once charged. Gas fees are paid to the network, never to NOVA, and NovaCont's deployment on Base keeps them typically well under a cent.

---

## Documentation

Full documentation, including the SDK reference, dispute walkthroughs, and FAQ: **https://novacont.gitbook.io/nova-docs**

---

## Roadmap

Kept intentionally short and undated, entries are tracked by status, not by promised dates.

- **In progress**: growing the juror pool toward `NovaJury` activation
- **In progress**: formal third-party smart contract audit
- **Planned**: expanded multi-token support beyond ETH and USDT

---

## Contributing

Contributions are welcome, see [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, workflow, and coding standards, and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community expectations.

---

## License

Licensed under the [PolyForm Shield License 1.0.0](./LICENSE.md). You're free to read, audit, and build on this code for non-competing purposes; you can't use it to build or ship a competing escrow product or service.

---

## Contact

| Purpose | Channel |
|---|---|
| General questions | support@novatechnology.app |
| Security reports | security@novatechnology.app |
| Community | [Discord](https://discord.gg/novacont) |

<div align="center">

**NOVA Cyber & Technology**
*Building Secure, Digital Futures.*

</div>
