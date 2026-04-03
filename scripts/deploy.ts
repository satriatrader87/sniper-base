const { ethers } = require("hardhat");
const dotenv = require("dotenv");

// Load variabel dari .env
dotenv.config();

async function main() {
    // 1. Ambil alamat provider & router dari .env
    const providerAddress = process.env.AAVE_POOL_PROVIDER;
    const routerAddress = process.env.AERODROME_ROUTER;

    if (!providerAddress || !routerAddress) {
        throw new Error("❌ ERROR: Alamat AAVE_POOL_PROVIDER atau AERODROME_ROUTER belum ada di .env!");
    }

    console.log("--------------------------------------------------");
    console.log("🚀 MEMULAI DEPLOY KONTRAK FLASH ARB V1...");
    console.log(`📍 Network: Base Mainnet`);
    console.log(`📍 Aave Pool Provider: ${providerAddress}`);
    console.log(`📍 Aerodrome Router: ${routerAddress}`);
    console.log("--------------------------------------------------");

    // 2. Ambil kontrak Factory
    const FlashArb = await ethers.getContractFactory("FlashArbV1");

    // 3. Proses Deploy
    // Parameter ini akan masuk ke 'constructor' di file .sol kamu
    const contract = await FlashArb.deploy(providerAddress, routerAddress);

    console.log("⏳ Menunggu konfirmasi transaksi (mungkin butuh beberapa detik)...");
    
    // 4. Tunggu sampai benar-benar masuk ke blockchain
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();

    console.log("--------------------------------------------------");
    console.log("✅ BERHASIL! Kontrak kamu sudah live di Base.");
    console.log(`🔥 ALAMAT KONTRAK: ${deployedAddress}`);
    console.log("--------------------------------------------------");
    console.log("👉 Copy alamat di atas ke .env pada bagian MY_CONTRACT_ADDRESS");
}

// Eksekusi fungsi main
main().catch((error) => {
    console.error("❌ DEPLOY GAGAL:");
    console.error(error);
    process.exit(1);
});
