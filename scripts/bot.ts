import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// --- KONFIGURASI BOT ---
// Disarankan pinjam USDC (6 desimal) agar perhitungan profit langsung dalam USD
const LOAN_DECIMALS = 6; 
const LOAN_AMOUNT_STR = "50000"; // Pinjam 50.000 USDC
const MIN_PROFIT_TRIGGER = 10.0; // Minimal profit $10 (setelah potong gas)

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const LOAN_AMOUNT = ethers.parseUnits(LOAN_AMOUNT_STR, LOAN_DECIMALS);
    const MY_CONTRACT_ADDRESS = process.env.MY_CONTRACT_ADDRESS!;
    const AERO_ROUTER_ADDRESS = process.env.AERODROME_ROUTER!;

    // Interface Router Aerodrome (Pastikan ABI Pas)
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

    // Setup Rute Arbitrase (Ambil dari .env)
    const ROUTES = [
        {
            name: "USDC-WETH-USDC",
            path: [
                { from: process.env.USDC_ADDRESS!, to: process.env.WETH_ADDRESS!, stable: false },
                { from: process.env.WETH_ADDRESS!, to: process.env.USDC_ADDRESS!, stable: false }
            ]
        }
    ];

    console.log("------------------------------------------");
    console.log("🎯 Sniper Bot Base Ready...");
    console.log(`📡 Network: ${process.env.BASE_RPC_URL?.includes('sepolia') ? 'TESTNET' : 'MAINNET'}`);
    console.log(`💰 Loan: ${LOAN_AMOUNT_STR} USDC`);
    console.log("------------------------------------------");

    provider.on("block", async (block: number) => {
        for (const route of ROUTES) {
            try {
                // Formatting rute untuk call contract
                const pathData = route.path.map((r) => [r.from, r.to, r.stable]);
                
                const amountsOut = await router.getAmountsOut(LOAN_AMOUNT, pathData);
                const finalAmount = amountsOut[amountsOut.length - 1];
                
                // Hutang Aave V3 = Pinjaman + 0.05% Premium
                const premium = (LOAN_AMOUNT * 5n) / 10000n;
                const totalDebt = LOAN_AMOUNT + premium;
                
                if (finalAmount > totalDebt) {
                    const profitRaw = finalAmount - totalDebt;
                    // Karena kita pinjam USDC, profitRaw ini sudah dalam satuan USD (6 desimal)
                    const profitUSD = parseFloat(ethers.formatUnits(profitRaw, LOAN_DECIMALS));

                    if (profitUSD > MIN_PROFIT_TRIGGER) {
                        console.log(`[BLOCK ${block}] 🔥 PROFIT DETECTED: $${profitUSD.toFixed(2)}`);
                        
                        // Encode parameters
                        const params = ethers.AbiCoder.defaultAbiCoder().encode(
                            ["tuple(address from, address to, bool stable)[]"], 
                            [route.path]
                        );

                        console.log("⚡ Eksekusi Flash Loan...");
                        
                        // Kirim transaksi dengan gas price sedikit lebih tinggi agar cepat (tip 10%)
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
                        
                        console.log(`✅ Hash: ${tx.hash}`);
                        await tx.wait();
                        console.log("💰 CUAN MASUK KE KONTRAK!");
                    }
                }
            } catch (e: any) {
                // Abaikan jika error rute tidak likuid
            }
        }
    });
}

main().catch((error) => {
    console.error("❌ Fatal Error:", error);
    process.exit(1);
});