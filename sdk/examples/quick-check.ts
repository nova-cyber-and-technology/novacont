import { createPublicClient, http } from "viem";
import { sepolia, baseSepolia } from "viem/chains";
import { NovaContClient } from "../src/index.js";

async function main() {
  console.log("🚀 NovaCont SDK Hızlı Doğrulama Başlatılıyor...\n");

  const chainName = process.env.CHAIN || "sepolia";
  const chain = chainName === "baseSepolia" ? baseSepolia : sepolia;
  const defaultRpc = chain.id === sepolia.id ? "https://ethereum-sepolia-rpc.publicnode.com" : "https://sepolia.base.org";
  const rpcUrl = process.env.TEST_RPC_URL || defaultRpc;
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x98B577d22710DaEA8c657dc415a591e6CD36B14a";

  console.log(`1. Viem PublicClient kuruluyor (Ağ: ${chain.name}, RPC: ${rpcUrl})...`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  console.log("2. NovaContClient örneği oluşturuluyor...");
  const client = new NovaContClient({
    publicClient,
    contractAddressOverride: contractAddress as `0x${string}`,
  });

  console.log("✅ SDK Sınıfı başarıyla örneklendi!");
  
  console.log(`\n3. [AĞ ÇAĞRISI] Kontrat (${contractAddress}) verileri sorgulanıyor...`);
  try {
    const contractCount = await client.getContractCount();
    const fee = await client.getPlatformFeePercentage();
    const isJuryActive = await client.isJurySystemActive();
    console.log(`   - Toplam Anlaşma Sayısı (contractCount): ${contractCount.toString()}`);
    console.log(`   - Platform Komisyon Oranı (platformFeePercentage): %${fee.toString()}`);
    console.log(`   - Jüri Sistemi Aktif mi (isJurySystemActive): ${isJuryActive ? 'Evet' : 'Hayır'}`);
    console.log("\n🎉 TEBRİKLER! SDK gerçek Ethereum Sepolia kontratı ile sorunsuz iletişim kuruyor!");
  } catch (err: any) {
    console.error("   ❌ Kontrat çağrısı başarısız oldu:", err.message || err);
  }
}

main().catch((err) => {
  console.error("Beklenmeyen Hata:", err);
  process.exit(1);
});
