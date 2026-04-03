import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { CONFIG, LOAN_AMOUNT, ROUTES } from "./config"; // Mengambil data dinamis

dotenv.config();

async function main() {
    // 1. Inisialisasi Provider & Wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const MY_CONTRACT_ADDRESS = process.env.MY_CONTRACT_ADDRESS!;
    const AERO_ROUTER_ADDRESS = process.env.AERODROME_ROUTER!;

    // 2. Inisialisasi Kontrak (Router Aerodrome & Kontrak Flash Arb Kamu)
    const router = new ethers.Contract(
        AERO_ROUTER_ADDRESS,
        ["function getAmountsOut(uint amountIn, (address from, address to, bool stable)[] routes) view returns (uint[] amounts)"],
        provider
    );

    const myContract = new ethers.Contract(
        MY_CONTRACT_ADDRESS,
        ["function startArb(address asset, uint256 amount, bytes calldata params) external"],
        wallet
    );

    console.log("------------------------------------------");
    console.log("🎯 Sniper Bot Base Ready...");
    console.log(`📡 Network: ${process.env.BASE_RPC_URL?.includes('sepolia') ? 'TESTNET' : 'MAINNET'}`);
    // MENGAMBIL ANGKA DARI CONFIG (OTOMATIS BERUBAH JIKA CONFIG DIUBAH)
    console.log(`💰 Loan   : ${CONFIG.LOAN_AMOUNT_RAW} USDC`);
    console.log(`📈 Target : > $${CONFIG.MIN_PROFIT_TRIGGER} Profit`);
    console.log("------------------------------------------");

    // 3. Monitor Setiap Blok Baru
    provider.on("block", async (block: number) => {
        // Loop melalui rute yang ada di config.ts
        for (const route of ROUTES) {
            try {
                // Formatting rute untuk call contract
                const pathData = route.path.map((r) => [r.from, r.to, r.stable]);
                
                // Cek harga ke Dex (Aerodrome)
                const amountsOut = await router.getAmountsOut(LOAN_AMOUNT, pathData);
                const finalAmount = amountsOut[amountsOut.length - 1];
                
                // Hitung Hutang Aave V3 (Pinjaman + 0.05% Fee Flash Loan)
                const premium = (LOAN_AMOUNT * 5n) / 10000n;
                const totalDebt = LOAN_AMOUNT + premium;
                
                // Cek apakah ada profit
                if (finalAmount > totalDebt) {
                    const profitRaw = finalAmount - totalDebt;
                    const profitUSD = parseFloat(ethers.formatUnits(profitRaw, CONFIG.LOAN_DECIMALS));

                    // Jika profit melebihi target di config
                    if (profitUSD > CONFIG.MIN_PROFIT_TRIGGER) {
                        console.log(`[BLOCK ${block}] 🔥 PROFIT DETECTED: $${profitUSD.toFixed(2)}`);
                        
                        // Encode parameter rute untuk dikirim ke Smart Contract
                        const params = ethers.AbiCoder.defaultAbiCoder().encode(
                            ["tuple(address from, address to, bool stable)[]"], 
                            [route.path]
                        );

                        console.log("⚡ Mengeksekusi Flash Loan ke Kontrak...");
                        
                        const feeData = await provider.getFeeData();
                        const tx = await myContract.startArb(
                            process.env.USDC_ADDRESS!, 
                            LOAN_AMOUNT, 
                            params, 
                            { 
                                gasLimit: 800000,
                                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined 
                            }
                        );
                        
                        console.log(`✅ Transaksi Terkirim! Hash: ${tx.hash}`);
                        await tx.wait();
                        console.log("💰 EKSEKUSI SELESAI. Cek saldo kontrak!");
                    }
                }
            } catch (e: any) {
                // Diamkan jika rute tidak memiliki likuiditas (error wajar di DEX)
            }
        }
    });
}

main().catch((error) => {
    console.error("❌ Fatal Error:", error.message || error);
    process.exit(1);
});