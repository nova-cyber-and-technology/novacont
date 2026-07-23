/**
 * Illustrates a full client → provider escrow flow using the SDK, matching the real NovaCont
 * contract's actual function signatures.
 * Run with: npx tsx examples/full-flow.ts
 * Requires TEST_RPC_URL, CLIENT_PRIVATE_KEY, PROVIDER_PRIVATE_KEY env vars pointed at Base Sepolia,
 * and real contract addresses filled in in src/constants.ts.
 */
import { createPublicClient, createWalletClient, http, keccak256, stringToHex } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { NovaContClient } from "../src/NovaContClient.js";
import { NATIVE_ETH_ADDRESS } from "../src/constants.js";

async function main() {
  const rpcUrl = process.env.TEST_RPC_URL!;
  const clientKey = process.env.CLIENT_PRIVATE_KEY as `0x${string}`;
  const providerKey = process.env.PROVIDER_PRIVATE_KEY as `0x${string}`;

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
  const clientWallet = createWalletClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
    account: privateKeyToAccount(clientKey),
  });
  const providerWallet = createWalletClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
    account: privateKeyToAccount(providerKey),
  });

  const asClient = new NovaContClient({ publicClient, walletClient: clientWallet });
  const asProvider = new NovaContClient({ publicClient, walletClient: providerWallet });

  // 1. Client decides on a $500 job and converts that to a wei amount using the live oracle price.
  //    (agreedPrice is denominated in the payment token itself on-chain, ETH here, not USD.)
  const agreedPriceWei = await asClient.quoteTokenAmountForUsd(NATIVE_ETH_ADDRESS, 500, 18);
  const { requiredDeposit, isAdaptiveCollateral } = await asClient.estimateRequiredDeposit(
    NATIVE_ETH_ADDRESS,
    agreedPriceWei
  );
  console.log("Agreed price (wei):", agreedPriceWei.toString());
  console.log("Required deposit (wei):", requiredDeposit.toString(), "adaptive:", isAdaptiveCollateral);

  // 2. Client creates and funds the agreement. metadataURI/metadataHash describe the job off-chain
  //    (e.g. an IPFS pointer to a spec doc); metadataHash lets anyone verify the URI's content
  //    hasn't been swapped after the fact.
  const metadataURI = "ipfs://example-job-spec-cid";
  const metadataHash = keccak256(stringToHex(metadataURI));

  const createHash = await asClient.createContract(
    {
      provider: providerWallet.account!.address,
      paymentToken: NATIVE_ETH_ADDRESS,
      metadataURI,
      metadataHash,
      acceptDays: 3n,
      deliveryDays: 7n,
      agreedPrice: agreedPriceWei,
      erc20DepositAmount: 0n, // unused for ETH payments
    },
    requiredDeposit
  );
  console.log("createContract tx:", createHash);

  // createContract has no return value on-chain, read the new ID back via contractCount()
  // (fine for a single-writer demo script; a real UI should watch the ContractCreated event
  // instead, to avoid a race if multiple agreements could be created concurrently).
  const contractId = await asClient.getContractCount();
  console.log("New contract ID:", contractId.toString());

  // 3. Provider accepts.
  const acceptHash = await asProvider.acceptContract(contractId);
  console.log("acceptContract tx:", acceptHash);

  // 4. Provider delivers.
  const deliverHash = await asProvider.deliverWork(contractId, "ipfs://example-evidence-cid");
  console.log("deliverWork tx:", deliverHash);

  // 5. Client approves, releasing payment.
  const approveHash = await asClient.approveWork(contractId);
  console.log("approveWork tx:", approveHash);

  // 6. Provider withdraws their credited balance, NovaCont uses the pull-payment pattern, nothing
  //    is sent automatically, approveWork only credits pendingWithdrawals.
  const withdrawHash = await asProvider.withdraw(NATIVE_ETH_ADDRESS);
  console.log("withdraw tx:", withdrawHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
