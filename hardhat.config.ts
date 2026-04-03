import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // Disarankan pakai toolbox agar lengkap
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  // Pengaturan Compiler agar kontrak lebih ringan & hemat gas
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Base Mainnet
    base: { 
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453, // Tambahkan chainId agar koneksi lebih stabil
    },
    // Base Sepolia (Testnet)
    "base-sepolia": { 
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532, // ChainId resmi Base Sepolia
    }
  },
  // Opsional: Jika ingin verifikasi kontrak di BaseScan nanti
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      "base-sepolia": process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};

export default config;