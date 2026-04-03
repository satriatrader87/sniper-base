import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// --- KONFIGURASI BOT ---
const LOAN_DECIMALS = 18; // 18 untuk WETH, 6 untuk USDC
const LOAN_AMOUNT_STR = "1.0"; // Jumlah pinjaman (Misal: 1.0 WETH)
const MIN_PROFIT_TRIGGER = 0.5; // Minimal profit $0.5 baru eksekusi

async function main() {
    // 1. Inisialisasi Provider & Wallet dari .env
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const LOAN_AMOUNT = ethers.parseUnits(LOAN_AMOUNT_STR, LOAN_DECIMALS);
    const MY_CONTRACT_ADDRESS = process.env.MY_CONTRACT_ADDRESS!;
    const AERO_ROUTER_ADDRESS = process.env.AERODROME_ROUTER!;

    // 2. Interface Kontrak
    const router = new ethers.Contract(
        AERO_ROUTER_ADDRESS,
        ["function getAmountsOut(uint amountIn, tuple(address from, address to, bool stable)[] routes) view returns (uint[] amounts)"],
        provider
    );

    const myContract = new ethers.Contract(
        MY_CONTRACT_ADDRESS,
        ["function startArb(address asset, uint256 amount, bytes calldata params) external"],
        wallet
    );

    // 3. Setup Rute Arbitrase (Otomatis ambil dari .env)
    const ROUTES = [
        {
            path: [
                { from: process.env.WETH_ADDRESS!, to: process.env.USDC_ADDRESS!, stable: false },
                { from: process.env.USDC_ADDRESS!, to: process.env.WETH_ADDRESS!, stable: false }
            ]
        }
    ];

    console.log("🎯 Sniper Bot Base Ready...");
    console.log(`📡 Monitoring Network: ${process.env.BASE_RPC_URL?.includes('sepolia') ? 'TESTNET' : 'MAINNET'}`);

    provider.on("block", async (block: number) => {
        for (const route of ROUTES) {
            try {
                // Mapping rute untuk Aerodrome
                const pathData = route.path.map((r: any) => [r.from, r.to, r.stable]);
                
                // Ambil estimasi output dari DEX
                const amountsOut = await router.getAmountsOut(LOAN_AMOUNT, pathData);
                const finalAmount = amountsOut[amountsOut.length - 1];
                
                // Hitung Hutang + Fee Aave V3 (0.05%)
                const debt = LOAN_AMOUNT + (LOAN_AMOUNT * 5n / 10000n);
                
                if (finalAmount > debt) {
                    const profitRaw = finalAmount - debt;
                    const profitUSD = parseFloat(ethers.formatUnits(profitRaw, LOAN_DECIMALS));

                    if (profitUSD > MIN_PROFIT_TRIGGER) {
                        console.log(`[BLOCK ${block}] 🔥 PROFIT TERDETEKSI: $${profitUSD.toFixed(4)}`);
                        
                        // Encode parameters untuk Smart Contract
                        const params = ethers.AbiCoder.defaultAbiCoder().encode(
                            ["tuple(address from, address to, bool stable)[]"], 
                            [route.path]
                        );

                        console.log("⚡ Menjalankan Flash Loan...");
                        const tx = await myContract.startArb(process.env.WETH_ADDRESS!, LOAN_AMOUNT, params, {
                            gasLimit: 1000000 
                        });
                        
                        console.log(`✅ TX Hash: ${tx.hash}`);
                        await tx.wait();
                        console.log("💰 Arbitrage Berhasil!");
                    }
                }
            } catch (e) {
                // Rute mungkin belum likuid, abaikan
            }
        }
    });
}

main().catch((error) => {
    console.error("❌ Fatal Error:", error);
    process.exit(1);
});