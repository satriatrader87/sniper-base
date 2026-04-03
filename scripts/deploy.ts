const { ethers } = require("hardhat");
const dotenv = require("dotenv");

// Load variabel dari .env
dotenv.config();

async function main() {
    console.log("--------------------------------------------------");
    console.log("🚀 MEMULAI DEPLOY KONTRAK FLASH ARB V1...");
    
    // 1. Ambil alamat dari .env
    // Gunakan ethers.getAddress() untuk validasi otomatis & konversi ke Checksum format
    let poolAddress, routerAddress;

    try {
        poolAddress = ethers.getAddress(process.env.AAVE_POOL_PROVIDER || "");
        routerAddress = ethers.getAddress(process.env.AERODROME_ROUTER || "");
    } catch (e) {
        throw new Error("❌ ERROR: Alamat AAVE_POOL_PROVIDER atau AERODROME_ROUTER di .env TIDAK VALID!");
    }

    // 2. Ambil data deployer
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
        // Deploy dengan alamat yang sudah divalidasi
        const contract = await FlashArb.deploy(poolAddress, routerAddress);

        console.log("⏳ Menunggu konfirmasi transaksi (Block Confirmation)...");
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
        // Penanganan error jika properti message tidak ada
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }
    }
}

// Eksekusi fungsi main
main().catch((error) => {
    console.error("❌ ERROR FATAL:");
    console.error(error);
    process.exit(1);
});