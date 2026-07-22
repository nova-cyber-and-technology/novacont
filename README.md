# NovaCont

A decentralized escrow protocol for digital services and online agreements.

NovaCont enables trust-minimized transactions between clients and providers using smart contracts, programmable settlement, and transparent dispute resolution.

> **Status:** Live on both Base Sepolia testnet and Base mainnet. The core escrow contract has been deployed and operating for a while. `NovaJury` (dispute resolution) is not yet live, it activates once there's an active community of users to draw jurors from. The contracts have not yet completed a formal third-party audit, see [Security & Audit Status](#security--audit-status) before committing significant funds.

---

## Why NovaCont

Traditional escrow services rely on trusted intermediaries, manual intervention, and centralized custody of funds.

NovaCont replaces those assumptions with programmable smart contracts that:

- Eliminate custodial risk
- Reduce counterparty trust requirements
- Provide transparent on-chain settlement
- Support decentralized dispute resolution
- Build reputation through completed agreements

---

## Features

- Non-custodial escrow
- Smart contract settlement
- Reputation system
- Dispute resolution via NovaJury, a separate contract that adjudicates disputed agreements when client and provider can't reach agreement directly. *(Not yet active, see status note above.)*
- Time-based automation
- Multi-network architecture
- Source-available smart contracts (see [License](#license))
- Publicly verifiable transactions

---

## Architecture

```
Client
  │
  ▼
NovaCont Smart Contract
  │
  ├── Provider
  └── NovaJury  (dispute resolution)
  │
  ▼
Settlement
```

`NovaCont` handles the escrow lifecycle: funds are locked at agreement creation and released on completion. `NovaJury` is designed to step in when client and provider can't agree that the work is done, but isn't active yet, it requires an established community of users to draw jurors from.

---

## Getting Started

```bash
git clone https://github.com/<org>/novacont.git
cd novacont
npm install
npx hardhat compile
npx hardhat test
```

For a local deployment or testnet configuration, see the setup guide in [`docs/`](./docs).

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

## Documentation

Full documentation: [https://docs.novatechnology.app](https://novacont.gitbook.io/nova-docs)

---

## Security & Audit Status

NovaCont has not yet completed a formal third-party smart contract audit. Audit reports will be published under [`audits/`](./audits) as they're completed. Until then, treat the mainnet contracts as unaudited and size any real funds accordingly.

Found a vulnerability? Please don't open a public Issue. Follow the instructions in [SECURITY.md](./SECURITY.md).

---

## License

Licensed under the [PolyForm Shield License 1.0.0](./LICENSE.md). You're free to read, audit, and build on this code for non-competing purposes; you can't use it to build or ship a competing escrow product or service.

---

**NOVA Cyber & Technology**
*Building Secure, Digital Futures.*
