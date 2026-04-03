// @ts-ignore
const { ethers } = require("hardhat");
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

async function main() {
    console.log("--------------------------------------------------");
    console.log("🚀 MEMULAI DEPLOY KONTRAK FLASH ARB V1...");
    console.log("--------------------------------------------------");

    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }

    // MEMPERBAIKI CHECKSUM DENGAN .toLowerCase()
    const rawPool = (process.env.AAVE_POOL_PROVIDER || "").toLowerCase().trim();
    const rawRouter = (process.env.AERODROME_ROUTER || "").toLowerCase().trim();

    if (!rawPool || !rawRouter) {
        console.error("❌ ERROR: Alamat di .env kosong!");
        process.exit(1);
    }

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log(`👤 Deployer      : ${deployer.address}`);
    console.log(`💰 Saldo Wallet  : ${ethers.formatEther(balance)} ETH`);
    console.log(`🎯 Pool Aave     : ${rawPool}`);
    console.log(`🎯 Router Aero   : ${rawRouter}`);
    console.log("--------------------------------------------------");

    const FlashArb = await ethers.getContractFactory("FlashArbV1");

    console.log("⏳ Mengirim transaksi deploy...");
    try {
        // Ethers akan otomatis mengonversi alamat lowercase menjadi checksum yang benar
        const contract = await FlashArb.deploy(rawPool, rawRouter);
        
        console.log("⏳ Menunggu konfirmasi blok...");
        await contract.waitForDeployment();

        const deployedAddress = await contract.getAddress();

        console.log("--------------------------------------------------");
        console.log("✅ BERHASIL! Kontrak sudah live.");
        console.log(`🔥 ALAMAT KONTRAK: ${deployedAddress}`);
        console.log("--------------------------------------------------");
    } catch (error: any) {
        console.error("❌ DEPLOY GAGAL:");
        console.error(error.message || error);
    }
}

main().catch((error: any) => {
    console.error("❌ ERROR FATAL:", error.message || error);
    process.exit(1);
});