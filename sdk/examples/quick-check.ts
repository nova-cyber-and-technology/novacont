import { createPublicClient, http } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { NovaContClient } from "../src/index.js";

async function main() {
  console.log("🚀 Starting NovaCont SDK quick check...\n");

  const chainName = process.env.CHAIN || "sepolia";
  const chain = chainName === "baseSepolia" ? baseSepolia : sepolia;
  const defaultRpc = chain.id === sepolia.id ? "https://ethereum-sepolia-rpc.publicnode.com" : "https://sepolia.base.org";
  const rpcUrl = process.env.TEST_RPC_URL || defaultRpc;
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x98B577d22710DaEA8c657dc415a591e6CD36B14a";

  console.log(`1. Setting up viem PublicClient (chain: ${chain.name}, RPC: ${rpcUrl})...`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log("2. Creating NovaContClient instance...");
  const client = new NovaContClient({
    publicClient,
    contractAddressOverride: contractAddress as `0x${string}`,
  });

  console.log("✅ SDK client instantiated successfully.");

  console.log(`\n3. [NETWORK CALL] Querying contract (${contractAddress})...`);
  try {
    const contractCount = await client.getContractCount();
    const fee = await client.getPlatformFeePercentage();
    const isJuryActive = await client.isJurySystemActive();
    console.log(`   - Total agreements (contractCount): ${contractCount.toString()}`);
    console.log(`   - Platform fee (platformFeePercentage): ${fee.toString()}%`);
    console.log(`   - Jury system active (isJurySystemActive): ${isJuryActive ? "yes" : "no"}`);
    console.log("\n🎉 SDK is communicating with the live contract successfully.");
  } catch (err: any) {
    console.error("   ❌ Contract call failed:", err.message || err);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
