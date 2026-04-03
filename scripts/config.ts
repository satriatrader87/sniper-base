import { ethers } from "ethers";
import { TOKENS } from "./addresses";

export const CONFIG = {
    LOAN_ASSET: TOKENS.USDC,
    LOAN_DECIMALS: 6,
    LOAN_AMOUNT_RAW: "50000",
    MIN_PROFIT_TRIGGER: 45.0,
    GAS_LIMIT_GWEI: "0.1",
    STOP_LOSS_ETH: "0.002",
};

export const LOAN_AMOUNT = ethers.parseUnits(CONFIG.LOAN_AMOUNT_RAW, CONFIG.LOAN_DECIMALS);

export const ROUTES = [
    { name: "WETH_LOOP", path: [{from: TOKENS.USDC, to: TOKENS.WETH, stable: false}, {from: TOKENS.WETH, to: TOKENS.USDC, stable: false}]},
    { name: "CBETH_TRI", path: [{from: TOKENS.USDC, to: TOKENS.WETH, stable: false}, {from: TOKENS.WETH, to: TOKENS.cbETH, stable: false}, {from: TOKENS.cbETH, to: TOKENS.USDC, stable: false}]}
];