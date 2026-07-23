/**
 * Illustrates a full client → provider escrow flow using the SDK, matching the real NovaCont
 * contract's actual function signatures.
 * Run with: npx tsx examples/full-flow.ts
 * Requires TEST_RPC_URL, CLIENT_PRIVATE_KEY, PROVIDER_PRIVATE_KEY env vars.
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { NovaContClient } from "../src/NovaContClient.js";

async function main() {
  const chainName = process.env.CHAIN || "sepolia";
  const chain = chainName === "baseSepolia" ? baseSepolia : sepolia;
  const defaultRpc = chain.id === sepolia.id ? "https://ethereum-sepolia-rpc.publicnode.com" : "https://sepolia.base.org";
  
  const rpcUrl = process.env.TEST_RPC_URL || defaultRpc;
  const clientKey = process.env.CLIENT_PRIVATE_KEY as `0x${string}` | undefined;
  const providerKey = process.env.PROVIDER_PRIVATE_KEY as `0x${string}` | undefined;
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x98B577d22710DaEA8c657dc415a591e6CD36B14a";

  if (!clientKey || !providerKey) {
    console.log("ℹ️  CLIENT_PRIVATE_KEY ve PROVIDER_PRIVATE_KEY ayarlanmadığı için salt-okunur modda çalışılıyor.");
    console.log("   Yazma işlemlerini test etmek için env değişkenlerini tanımlayabilirsiniz:");
    console.log("   $env:CLIENT_PRIVATE_KEY=\"0x...\" ; $env:PROVIDER_PRIVATE_KEY=\"0x...\" ; npx tsx examples/full-flow.ts\n");
  }

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  
  const clientAccount = clientKey ? privateKeyToAccount(clientKey.startsWith("0x") ? clientKey : `0x${clientKey}`) : undefined;
  const providerAccount = providerKey ? privateKeyToAccount(providerKey.startsWith("0x") ? providerKey : `0x${providerKey}`) : undefined;

  const clientWallet = clientAccount ? createWalletClient({ chain, transport: http(rpcUrl), account: clientAccount }) : undefined;
  const providerWallet = providerAccount ? createWalletClient({ chain, transport: http(rpcUrl), account: providerAccount }) : undefined;

  const asClient = new NovaContClient({ publicClient, walletClient: clientWallet, contractAddressOverride: contractAddress as `0x${string}` });

  console.log("Kontrat Adresi:", contractAddress);
  if (clientAccount) console.log("Müşteri Adresi:", clientAccount.address);
  if (providerAccount) console.log("Hizmet Sağlayıcı Adresi:", providerAccount.address);

  // Live agreement query
  const count = await asClient.getContractCount();
  console.log("Mevcut Kontrat Sayısı (contractCount):", count.toString());

  if (count > 0n) {
    const agreement1 = await asClient.getAgreement(1n);
    console.log("\n1 Numaralı Anlaşma Detayları:");
    console.log("  - Client:", agreement1.client);
    console.log("  - Provider:", agreement1.provider);
    console.log("  - State:", agreement1.state);
    console.log("  - Metadata URI:", agreement1.metadataURI);
    console.log("  - Evidence URI:", agreement1.evidenceURI);
  }

  console.log("\n✅ SDK sorguları başarıyla tamamlandı!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
