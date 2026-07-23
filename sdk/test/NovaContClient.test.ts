import { describe, it, expect, beforeAll } from "vitest";
import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { NovaContClient } from "../src/NovaContClient.js";
import { NATIVE_ETH_ADDRESS } from "../src/constants.js";

/**
 * Real tests need either a local Base fork (Anvil) or a funded Sepolia testnet account, plus the
 * real deployed contract address in constants.ts. Set these env vars to run them:
 *   TEST_RPC_URL, TEST_PRIVATE_KEY
 * Without them, tests skip gracefully rather than failing CI with a confusing error.
 */
describe("NovaContClient", () => {
  let client: NovaContClient;

  beforeAll(() => {
    const rpcUrl = process.env.TEST_RPC_URL;
    const privateKey = process.env.TEST_PRIVATE_KEY as `0x${string}` | undefined;
    if (!rpcUrl || !privateKey) return;

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
      account: privateKeyToAccount(privateKey),
    });

    client = new NovaContClient({ publicClient, walletClient });
  });

  it.skipIf(!process.env.TEST_RPC_URL)("reads the ETH price from the oracle", async () => {
    const price = await client.getLatestTokenUSDPrice(NATIVE_ETH_ADDRESS);
    expect(price).toBeGreaterThan(0n);
  });

  it.skipIf(!process.env.TEST_RPC_URL)(
    "estimates a standard (>= $200) deposit with no adaptive collateral",
    async () => {
      const estimate = await client.estimateRequiredDeposit(NATIVE_ETH_ADDRESS, 500n * 10n ** 18n);
      // NOTE: this passes agreedPrice in wei directly for illustration; in a real ETH agreement
      // agreedPrice is priced in ETH terms already, adjust based on how your UI collects the amount.
      expect(estimate.isAdaptiveCollateral).toBe(false);
    }
  );

  it.skipIf(!process.env.TEST_RPC_URL)("reads the current platform fee percentage", async () => {
    const fee = await client.getPlatformFeePercentage();
    expect(fee).toBeGreaterThanOrEqual(0n);
    expect(fee).toBeLessThanOrEqual(10n);
  });
});
