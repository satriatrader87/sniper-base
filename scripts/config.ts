import { ethers } from "ethers";
import { TOKENS } from "./addresses";

/**
 * @dev DASHBOARD STRATEGI ALVIN
 * ----------------------------
 * LOAN_ASSET: Token yang kita pinjam (USDC desimal 6).
 * MIN_PROFIT_TRIGGER: Untung bersih (setelah bunga Aave) dalam USD.
 * STOP_LOSS_ETH: Batas minimal saldo wallet agar tidak kehabisan gas.
 */
export const CONFIG = {
    LOAN_ASSET: TOKENS.USDC,
    LOAN_DECIMALS: 6,
    LOAN_AMOUNT_RAW: "100",      // Pinjam $50k
    MIN_PROFIT_TRIGGER: 10.0,      // Minimal cuan $45
    GAS_LIMIT_GWEI: "0.1",         // Proteksi gas (Base sangat murah)
    STOP_LOSS_ETH: "0.002",        // Sisakan minimal 0.002 ETH di wallet
};

// Pre-calculate jumlah pinjaman agar bot lebih ringan
export const LOAN_AMOUNT = ethers.parseUnits(CONFIG.LOAN_AMOUNT_RAW, CONFIG.LOAN_DECIMALS);

/**
 * @dev DAFTAR RUTE (ROUTES)
 * Kamu bisa menambah rute baru di sini tanpa mengubah kode bot.ts
 */
export const ROUTES = [
    { 
        name: "WETH_LOOP", 
        path: [
            { from: TOKENS.USDC, to: TOKENS.WETH, stable: false }, 
            { from: TOKENS.WETH, to: TOKENS.USDC, stable: false }
        ] 
    },
    { 
        name: "CBETH_TRI", 
        path: [
            { from: TOKENS.USDC, to: TOKENS.WETH, stable: false }, 
            { from: TOKENS.WETH, to: TOKENS.cbETH, stable: false }, 
            { from: TOKENS.cbETH, to: TOKENS.USDC, stable: false }
        ] 
    },
    {
        // Tambahan Rute Stablecoin (Sering selisih tipis tapi pasti)
        name: "DAI_ARBITRAGE",
        path: [
            { from: TOKENS.USDC, to: TOKENS.DAI, stable: true },
            { from: TOKENS.DAI, to: TOKENS.WETH, stable: false },
            { from: TOKENS.WETH, to: TOKENS.USDC, stable: false }
        ]
    }
];