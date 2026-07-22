# Security Policy

NovaCont is a decentralized escrow protocol securing real user funds through smart contracts. We take security reports seriously and rely on responsible disclosure from the research community to keep it that way.

This policy is specific to the NovaCont repository. For NOVA's org-wide policy, see [NOVA's SECURITY.md](https://github.com/NOVA-Cyber-Technology/.github/blob/main/SECURITY.md); where the two differ, this document governs for NovaCont.

---

## Supported Deployments

NovaCont contracts are immutable once deployed, "supported version" means the currently deployed, canonical contract address, not a package version.

| Network | Contract | Status |
|---|---|---|
| Base Mainnet | NovaCont.sol | ✅ Canonical, supported |
| Base Sepolia | NovaCont.sol | ✅ Supported (testnet) |
| Base Mainnet / Sepolia | NovaJury.sol | Deployed, not yet handling live disputes (see [Bug Bounty Scope](#bug-bounty-scope)) |

> Current contract addresses are listed in the [README](./README.md). If you're reporting an issue, always confirm you're looking at the address listed there, not an address you found elsewhere, before reporting.

---

## Reporting a Vulnerability

**Do not disclose vulnerabilities publicly before they've been reviewed and addressed.**

Report privately through either:

- **Email:** security@novatechnology.app
- **GitHub Security Advisory:** https://github.com/NOVA-Cyber-Technology/NovaCont/security/policy

Include as much of the following as you can:

- Description of the issue
- Steps to reproduce, or a proof of concept
- Expected impact
- Suggested mitigation (optional)

### If Your Report Involves a Deployed Contract

Also include:

- Network (Base Mainnet / Base Sepolia)
- Contract address (confirm it matches the one in the [README](./README.md))
- Transaction hash and block number, if applicable
- Function(s) involved
- Whether user funds are at risk, and roughly how much

---

## Severity Guidelines

Grounded in NovaCont's actual attack surface, documented in the [Security Model](./docs/security-model.md):

**Critical**
- Bypassing `nonReentrant` protections to drain funds from `pendingWithdrawals`
- Unauthorized invocation of `onlyJuryContract`-gated functions
- Any path to unilateral, unauthorized fund transfer or theft of escrowed assets

**High**
- Oracle manipulation that meaningfully under- or over-collateralizes a deposit
- A path to permanent fund lockup with no available exit or timeout
- Contract takeover via an ownership-transfer or access-control flaw
- Exploitable manipulation of `NovaJury`'s pseudo-random juror selection

**Medium**
- Denial of service against specific functions
- Incorrect state transitions (skipping or reversing a defined lifecycle step)
- Fee or dispute-fee calculation errors

**Low**
- Gas inefficiencies, missing event emissions, documentation mistakes
- UI-related issues with no on-chain security impact

---

## Known, Accepted Risks (Not Eligible for Reward)

The following are documented, deliberate design tradeoffs, not vulnerabilities. Reports that only restate these won't be treated as new findings, though we're glad to hear if you've found a way to exploit them further:

- **Owner capabilities.** The contract owner can pause the contract, force-cancel any agreement (always resulting in a full client refund), change the platform fee (capped at 10%), change the dispute resolver, toggle the jury system, and manage supported tokens and price feeds. This is an acknowledged centralization tradeoff at the protocol's current stage; the intent is to progressively reduce it through timelocks, multisig, and eventually on-chain governance.
- **Pseudo-random juror selection.** `NovaJury` selects jurors using `blockhash`, `prevrandao`, `gasleft`, and a nonce, not a verifiable randomness source. A validator with unusual control over block production could theoretically influence outcomes; this is accepted at the protocol's current scale, with Chainlink VRF integration as a possible future upgrade.
- **Oracle dependency.** Deposit calculations rely on Chainlink price feeds with a 24-hour staleness check. Extended oracle downtime or a compromised feed could affect deposit accuracy; the staleness check mitigates but doesn't eliminate this.
- **No appeal mechanism.** Dispute verdicts, administrator or jury-issued, are final and irreversible once executed on-chain.
- **Off-chain evidence permanence.** Evidence URIs point to off-chain resources. NovaCont can't guarantee their continued availability.
- **Fee-on-transfer tokens are unsupported.** The contract assumes the declared deposit amount equals the amount received; fee-on-transfer tokens would create an accounting mismatch and aren't supported.

---

## Response Targets

| Stage | Target |
|---|---|
| Initial acknowledgement | Within 48 hours |
| Initial triage | Within 7 days |
| Status updates | As needed while remediation is in progress |

Complex smart contract issues may need additional review time before we can share a complete response.

---

## Safe Harbor

We won't pursue legal action against researchers who act in good faith:

- Avoid violating user privacy
- Don't exploit a vulnerability beyond what's needed to demonstrate impact
- Don't intentionally disrupt protocol operations
- Follow this disclosure policy

---

## Bug Bounty Scope

| Contract | Network | In Scope |
|---|---|---|
| `NovaCont.sol` | Base | ✅ Yes |
| `NovaJury.sol` | Base | ❌ No, not yet handling live disputes |
| `NovaContLite.tact` | TON | ✅ Yes |

**Out of scope:** frontend/UI bugs (report via a regular GitHub Issue instead, these aren't security reports), third-party infrastructure (Chainlink, TonConnect, Telegram, wallet providers), and social engineering.

Also generally out of scope:

- Missing HTTP security headers, clickjacking without practical impact, self-XSS
- Denial-of-service requiring unrealistic resources
- Reports based solely on outdated dependencies, with no demonstrated exploitability
- Issues in third-party services outside NovaCont's control

### Rewards

NovaCont doesn't currently offer a monetary or material bug bounty. Verified reports are credited in our Hall of Fame (with your permission) regardless of severity, we treat this as recognition, not compensation, and want to be upfront about that rather than imply otherwise.

### Reporting Conduct

Any testing that violates these rules falls outside the reward program and may create legal liability:

- No live attacks against real user funds on mainnet; test on Sepolia or with your own wallets
- No testing that could cause a denial of service
- No social engineering or phishing against real users or the team

You'll receive an acknowledgement within 48 hours (see [Response Targets](#response-targets)). If validated, details stay confidential until a fix ships; afterward, the finding may be disclosed publicly with your permission.

---

## Third-Party Dependencies

NovaCont relies on external infrastructure including, but not limited to, Base, Ethereum, Chainlink, and wallet providers. Issues in these platforms should go to their own maintainers, not to us.

---

## Audit Status

NovaCont has not yet completed a **formal third-party security audit**. What has been done: a static analysis pass (Slither, 101 detectors, two compilation passes) with every Medium+ finding manually verified. Result: zero Critical or High findings; all four Medium candidates were reviewed and closed as not exploitable, with justification documented. Remaining findings are gas optimizations and code style.

This is a positive signal about the codebase's current maturity, it is **not** a substitute for an independent audit. A formal audit is planned as part of the path to full production readiness; reports will be published in full under [`audits/`](./audits) when available.

**Don't deposit funds you can't afford to lose until a formal audit is complete.**

---

## Hall of Fame

We're grateful to researchers who disclose responsibly. Verified reporters are listed here (with permission) as they're confirmed.

- *List will be updated as reports are resolved.*

---

## Contact

Security Team
security@novatechnology.app
https://novatechnology.app

Thank you for helping keep NovaCont secure.
