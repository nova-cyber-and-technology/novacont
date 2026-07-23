# @novacont/sdk

TypeScript SDK for the NovaCont escrow protocol on Base, built on [viem](https://viem.sh).

> **Verified against the real contract source.** Every method name, parameter, and return shape in this SDK was checked function-by-function against the actual `NovaCont.sol` and `NovaJury.sol` source, not guessed from documentation. See [Before You Ship This](#before-you-ship-this) for the two things that still need your input (addresses, decimals).

## Install (once published)

```bash
npm install @novacont/sdk viem
```

## Quick Start

```ts
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { NovaContClient, NATIVE_ETH_ADDRESS } from "@novacont/sdk";

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const client = new NovaContClient({ publicClient });

const agreement = await client.getAgreement(1n);
console.log(agreement.state);

const ethPrice = await client.getLatestTokenUSDPrice(NATIVE_ETH_ADDRESS);
```

See [`examples/full-flow.ts`](./examples/full-flow.ts) for a complete client → provider → withdraw walkthrough.

## Project Layout

```
src/
  NovaContClient.ts   Escrow lifecycle: create, accept, reject, deliver, approve, cancel, dispute, withdraw
  NovaJuryClient.ts   Jury lifecycle: staking, voting, case resolution (not yet live on mainnet)
  abi/                ABIs transcribed directly from the reviewed .sol source
  types.ts            EscrowContract, DisputeDetails, Juror, Case types matching the contracts' own structs
  constants.ts         Network addresses, fee/collateral/timing constants pulled from the contracts
  errors.ts            Revert-reason decoding, grouped by category (NotAuthorizedError, DeadlineError, etc)
  modules/events.ts    Event subscription helpers for the real contract events
test/                  Vitest suite (skips gracefully without a configured RPC/test account)
examples/              Runnable integration example
```

## Known Design Decisions (open for review)

A few choices worth a second opinion before this ships:

- **Errors are grouped by category, not one class per `require()` string.** Both contracts use ~60 `require(condition, "string")` reverts total, mapping each 1:1 to a subclass would be pure boilerplate. Instead, `errors.ts` classifies reverts into `NotAuthorizedError`, `DeadlineError`, `AlreadyProcessedError`, `InvalidStateError`, falling back to a generic `ContractRevertError` with the real string attached. Reconsider this if consumers need to distinguish, say, "Only provider" from "Only client" programmatically rather than just reading `.reason`.
- **`getAgreement()` merges two on-chain calls into one object.** The contract splits agreement data across `getContractCore` and `getContractDetails` (a stack-too-deep workaround), the SDK hides that by calling both and merging the result. This costs an extra RPC round-trip per read; a batching-aware caller could call the two ABI methods directly instead if that matters for their use case.
- **`quoteTokenAmountForUsd()` and `estimateRequiredDeposit()` are estimates, not authoritative.** `createContract`'s `agreedPrice` is denominated in the payment token itself (wei for ETH), not USD, these helpers convert client-side using the same oracle read the contract itself uses, but the price can move before your transaction lands. The contract's own math at execution time is the real source of truth.
- **`onCounterFeePaid`, `settleDisputeByJury`, and `createCase` are exposed on the clients even though they're restricted to the paired contract address on-chain** (`onlyJuryContract` / `onlyNovaCont`). Kept for completeness and local/fork testing, but a real dApp built on this SDK should never call these directly, they exist so the two contracts can be tested and reasoned about together.

## Before You Ship This

1. **Fill in real contract addresses.** `src/constants.ts` has `0x000...` placeholders for both networks, marked `TODO(VERIFY)`. Pull the real ones from the repo's main README and keep this file in sync going forward.
2. **Wire up `getErc20Decimals()`.** Currently throws rather than guessing, if you're supporting USDT or another ERC-20 beyond ETH, read its real `decimals()` (viem ships an `erc20Abi` for exactly this) before calling `estimateRequiredDeposit` or `quoteTokenAmountForUsd` for that token.

## Development

```bash
npm install
npm run build       # bundles src/ to dist/ via tsup
npm run typecheck    # tsc --noEmit
npm test             # vitest, most tests skip without TEST_RPC_URL set
```

## License

MIT, see [LICENSE](../LICENSE.md) for why this differs from the PolyForm Shield license on the core contracts: the SDK's purpose is to make it easy for anyone to build *against* NovaCont, unlike the contract source, permissive licensing here supports adoption rather than working against it. This is a judgment call, not a legal necessity, revisit it if your priorities change.

