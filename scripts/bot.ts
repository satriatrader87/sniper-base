import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { CONFIG, LOAN_AMOUNT, ROUTES } from "./config"; 

dotenv.config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const MY_CONTRACT_ADDRESS = process.env.MY_CONTRACT_ADDRESS!;
    const AERO_ROUTER_ADDRESS = process.env.AERODROME_ROUTER!;

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
    console.log(`💰 Loan   : ${CONFIG.LOAN_AMOUNT_RAW} USDC`);
    console.log(`📈 Target : > $${CONFIG.MIN_PROFIT_TRIGGER} Profit`);
    console.log(`🛣️ Routes : ${ROUTES.length} Jalur Aktif`);
    console.log("------------------------------------------");

    provider.on("block", async (block: number) => {
        process.stdout.write(`\r🔍 Memantau Blok: ${block} | Mencari Peluang...`);

        for (const route of ROUTES) {
            try {
                const pathData = route.path.map((r) => [r.from, r.to, r.stable]);
                const amountsOut = await router.getAmountsOut(LOAN_AMOUNT, pathData);
                const finalAmount = amountsOut[amountsOut.length - 1];
                
                // Hutang Aave = Pinjaman + 0.05% Fee
                const premium = (LOAN_AMOUNT * 5n) / 10000n;
                const totalDebt = LOAN_AMOUNT + premium;

                // --- FITUR DEBUG: Muncul setiap 5 blok agar tidak terlalu penuh ---
                if (block % 5 === 0) {
                    const hasil = ethers.formatUnits(finalAmount, CONFIG.LOAN_DECIMALS);
                    const butuh = ethers.formatUnits(totalDebt, CONFIG.LOAN_DECIMALS);
                    console.log(`\n📊 [DEBUG] Rute: ${route.name} | Dapat: ${hasil} | Harus Balik: ${butuh}`);
                }

                if (finalAmount > totalDebt) {
                    const profitRaw = finalAmount - totalDebt;
                    const profitUSD = parseFloat(ethers.formatUnits(profitRaw, CONFIG.LOAN_DECIMALS));

                    if (profitUSD > CONFIG.MIN_PROFIT_TRIGGER) {
                        console.log(`\n\n[BLOCK ${block}] 🔥 PROFIT DETECTED: $${profitUSD.toFixed(2)}`);
                        
                        const params = ethers.AbiCoder.defaultAbiCoder().encode(
                            ["tuple(address from, address to, bool stable)[]"], 
                            [route.path]
                        );

                        console.log("⚡ Mengeksekusi Flash Loan...");
                        const feeData = await provider.getFeeData();
                        const tx = await myContract.startArb(
                            process.env.USDC_ADDRESS!, 
                            LOAN_AMOUNT, 
                            params, 
                            { 
                                gasLimit: 1000000,
                                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined 
                            }
                        );
                        
                        console.log(`✅ Hash: ${tx.hash}`);
                        await tx.wait();
                        console.log("💰 EKSEKUSI SELESAI!\n");
                    }
                }
            } catch (e: any) {
                // Abaikan error rute sepi
            }
        }
    });
}

main().catch((error) => {
    console.error("\n❌ Fatal Error:", error.message || error);
    process.exit(1);
});