import { ethers } from "ethers";
import { TOKENS } from "./addresses.js";

/**
 * @dev PANDUAN PINDAH KOIN/JARINGAN:
 * 1. LOAN_DECIMALS: Wajib 6 untuk USDC/USDT, 18 untuk DAI/WETH.
 * 2. ROUTES: Pastikan token di path ada di file addresses.ts.
 */
export const CONFIG = {
    LOAN_ASSET: TOKENS.USDC,       // Token yang dipinjam dari Aave
    LOAN_DECIMALS: 6,              // Desimal token pinjaman
    LOAN_AMOUNT_RAW: "50000",      // Nominal pinjaman (USD)
    
    MIN_PROFIT_TRIGGER: 45.0,      // Minimal untung $45 baru bot nembak
    GAS_LIMIT_GWEI: "0.1",         // Jangan nembak jika gas naik
    STOP_LOSS_ETH: "0.002",        // Berhenti jika saldo ETH sisa sedikit
};

export const LOAN_AMOUNT = ethers.parseUnits(CONFIG.LOAN_AMOUNT_RAW, CONFIG.LOAN_DECIMALS);

export const ROUTES = [
    { 
        name: "WETH_LOOP", 
        path: [
            { from: TOKENS.USDC, to: TOKENS.WETH, stable: false }, 
            { from: TOKENS.WETH, to: TOKENS.USDC, stable: false }
        ] 
    },
    { 
        name: "CBETH_TRIANGLE", 
        path: [
            { from: TOKENS.USDC, to: TOKENS.WETH, stable: false }, 
            { from: TOKENS.WETH, to: TOKENS.cbETH, stable: false }, 
            { from: TOKENS.cbETH, to: TOKENS.USDC, stable: false }
        ] 
    }
];
