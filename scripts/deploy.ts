const { ethers } = require("hardhat");
const dotenv = require("dotenv");

// Load variabel dari .env
dotenv.config();

async function main() {
    console.log("--------------------------------------------------");
    console.log("🚀 MEMULAI DEPLOY KONTRAK FLASH ARB V1...");
    
    // 1. Ambil & Validasi alamat dari .env
    let poolAddress, routerAddress;

    try {
        // ethers.getAddress() memastikan format Checksum (case-sensitive valid)
        poolAddress = ethers.getAddress(process.env.AAVE_POOL_PROVIDER || "");
        routerAddress = ethers.getAddress(process.env.AERODROME_ROUTER || "");
    } catch (e) {
        console.error("❌ ERROR: Alamat di .env TIDAK VALID (Cek AAVE_POOL_PROVIDER / AERODROME_ROUTER)");
        process.exit(1);
    }

    // 2. Ambil data deployer (Wallet yang membayar gas)
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`👤 Deployer      : ${deployer.address}`);
    console.log(`💰 Saldo Wallet  : ${ethers.formatEther(balance)} ETH`);
    console.log(`🎯 Target Pool   : ${poolAddress}`);
    console.log(`🎯 Target Router : ${routerAddress}`);
    console.log("--------------------------------------------------");

    // 3. Ambil kontrak Factory
    const FlashArb = await ethers.getContractFactory("FlashArbV1");

    // 4. Proses Deploy
    console.log("⏳ Mengirim transaksi deploy ke blockchain...");
    
    try {
        // Deploy kontrak
        const contract = await FlashArb.deploy(poolAddress, routerAddress);

        console.log("⏳ Menunggu konfirmasi blok...");
        await contract.waitForDeployment();

        const deployedAddress = await contract.getAddress();

        console.log("--------------------------------------------------");
        console.log("✅ BERHASIL! Kontrak kamu sudah live.");
        console.log(`🔥 ALAMAT KONTRAK: ${deployedAddress}`);
        console.log("--------------------------------------------------");
        console.log("👉 LANGKAH SELANJUTNYA:");
        console.log(`1. Salin alamat: ${deployedAddress}`);
        console.log(`2. Buka .env, masukkan ke MY_CONTRACT_ADDRESS`);
        console.log(`3. Jalankan bot: npx ts-node scripts/bot.ts`);
        console.log("--------------------------------------------------");
    } catch (error) {
        console.error("❌ DEPLOY GAGAL:");
        if (error instanceof Error) {
            // Cek jika error karena saldo tidak cukup
            if (error.message.includes("insufficient funds")) {
                console.error("Saldo ETH tidak cukup untuk bayar GAS!");
            } else {
                console.error(error.message);
            }
        } else {
            console.error(error);
        }
    }
}

main().catch((error) => {
    console.error("❌ ERROR FATAL:");
    console.error(error);
    process.exit(1);
});