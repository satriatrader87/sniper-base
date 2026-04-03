const { ethers } = require("hardhat");
import { CONFIG, ROUTES, LOAN_AMOUNT } from "./config.js";

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    const router = new ethers.Contract(process.env.AERODROME_ROUTER!, ["function getAmountsOut(uint in, tuple(address from, address to, bool stable)[] r) view returns (uint[] a)"], provider);
    const myContract = new ethers.Contract(process.env.MY_CONTRACT_ADDRESS!, ["function startArb(address asset, uint256 amount, bytes calldata params) external"], wallet);

    console.log("🎯 Sniper Bot Base Ready...");

    provider.on("block", async (block: number) => {
        for (const route of ROUTES) {
            try {
                const pathData = route.path.map((r: any) => [r.from, r.to, r.stable]);
                const amountsOut = await router.getAmountsOut(LOAN_AMOUNT, pathData);
                const finalAmount = amountsOut[amountsOut.length - 1];
                
                const debt = LOAN_AMOUNT + (LOAN_AMOUNT * 5n / 10000n);
                const profitUSD = parseFloat(ethers.formatUnits(finalAmount - debt, CONFIG.LOAN_DECIMALS));

                if (profitUSD > CONFIG.MIN_PROFIT_TRIGGER) {
                    console.log(`[BLOCK ${block}] 🔥 PROFIT: $${profitUSD.toFixed(2)}`);
                    // Untuk Live: Hapus /* dan */ di bawah ini
                    /*
                    const params = ethers.AbiCoder.defaultAbiCoder().encode(["tuple(address from, address to, bool stable)[]"], [route.path]);
                    await myContract.startArb(CONFIG.LOAN_ASSET, LOAN_AMOUNT, params);
                    */
                }
            } catch (e) {}
        }
    });
}
main();
