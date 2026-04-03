const { ethers } = require("hardhat");
const dotenv = require("dotenv");

// Load variabel dari .env
dotenv.config();

async function main() {
    console.log("--------------------------------------------------");
    console.log("🚀 MEMULAI DEPLOY KONTRAK FLASH ARB V1...");
    
    // 1. Ambil alamat dari .env dan paksa jadi lowercase agar tidak error checksum
    const rawPool = process.env.AAVE_POOL_PROVIDER || "";
    const rawRouter = process.env.AERODROME_ROUTER || "";

    const poolAddress = rawPool.trim().toLowerCase();
    const routerAddress = rawRouter.trim().toLowerCase();

    // Validasi dasar
    if (!poolAddress || !routerAddress || poolAddress === "" || routerAddress === "") {
        throw new Error("❌ ERROR: Alamat AAVE_POOL_PROVIDER atau AERODROME_ROUTER kosong di .env!");
    }

    // 2. Ambil data deployer
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`📍 Network      : Base Sepolia (Testnet)`);
    console.log(`👤 Deployer     : ${deployer.address}`);
    console.log(`💰 Saldo Wallet : ${ethers.formatEther(balance)} ETH`);
    console.log(`🎯 Target Pool  : ${poolAddress}`);
    console.log(`🎯 Target Router: ${routerAddress}`);
    console.log("--------------------------------------------------");

    // 3. Ambil kontrak Factory
    const FlashArb = await ethers.getContractFactory("FlashArbV1");

    // 4. Proses Deploy
    console.log("⏳ Mengirim transaksi deploy ke blockchain...");
    
    try {
        // Kita kirim alamat yang sudah di-lowercase-kan
        const contract = await FlashArb.deploy(poolAddress, routerAddress, {
            gasLimit: 3000000 
        });

        console.log("⏳ Menunggu konfirmasi transaksi...");
        await contract.waitForDeployment();

        const deployedAddress = await contract.getAddress();

        console.log("--------------------------------------------------");
        console.log("✅ BERHASIL! Kontrak kamu sudah live di Base Sepolia.");
        console.log(`🔥 ALAMAT KONTRAK: ${deployedAddress}`);
        console.log("--------------------------------------------------");
        console.log("👉 LANGKAH SELANJUTNYA:");
        console.log(`1. Salin alamat: ${deployedAddress}`);
        console.log(`2. Buka .env, masukkan ke MY_CONTRACT_ADDRESS`);
        console.log(`3. Jalankan bot: npx ts-node scripts/bot.ts`);
        console.log("--------------------------------------------------");
    } catch (error) {
        console.error("❌ DEPLOY GAGAL DI TENGAH JALAN:");
        console.error(error.message);
    }
}

// Eksekusi fungsi main
main().catch((error) => {
    console.error("❌ ERROR FATAL:");
    console.error(error);
    process.exit(1);
});