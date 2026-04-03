// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Interface resmi Aave V3 untuk FlashLoanSimple.
 * Menambahkan ini memastikan Aave mengenali kontrak kamu.
 */
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);

    function ADDRESSES_PROVIDER() external view returns (address);
    function POOL() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IAerodromeRouter {
    struct Route { address from; address to; bool stable; }
    function swapExactTokensForTokens(
        uint amountIn, 
        uint outMin, 
        Route[] calldata r, 
        address to, 
        uint d
    ) external returns (uint[] memory a);
}

contract FlashArbV1 is IFlashLoanSimpleReceiver {
    address public immutable owner;
    address public immutable aeroRouter;
    address public immutable override ADDRESSES_PROVIDER; // Wajib ada untuk Aave
    IPool public immutable override POOL;

    constructor(address _pool, address _router) {
        owner = msg.sender;
        POOL = IPool(_pool);
        aeroRouter = _router;
        ADDRESSES_PROVIDER = address(0); // Dummy untuk memenuhi interface
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    /**
     * @notice Memulai pinjaman kilat (Flash Loan)
     */
    function startArb(address asset, uint256 amount, bytes calldata params) external onlyOwner {
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    /**
     * @notice Fungsi ini dipanggil otomatis oleh Aave setelah uang dikirim ke kontrak kita
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address, // initiator
        bytes calldata params
    ) external override returns (bool) {
        // Keamanan: Hanya Pool Aave yang boleh memanggil fungsi ini
        require(msg.sender == address(POOL), "!pool");

        uint256 totalDebt = amount + premium;
        IAerodromeRouter.Route[] memory routes = abi.decode(params, (IAerodromeRouter.Route[]));

        // 1. Berikan izin kepada DEX untuk menggunakan uang pinjaman
        IERC20(asset).approve(aeroRouter, amount);
        
        // 2. Eksekusi Swap (Arbitrage)
        // Proteksi: outMin diisi totalDebt agar jika hasil swap < hutang, transaksi langsung gagal (hemat gas)
        IAerodromeRouter(aeroRouter).swapExactTokensForTokens(
            amount, 
            totalDebt, 
            routes, 
            address(this), 
            block.timestamp + 15
        );

        // 3. Validasi akhir saldo harus lebih besar atau sama dengan hutang + bunga
        require(IERC20(asset).balanceOf(address(this)) >= totalDebt, "RUGI!");

        // 4. Berikan izin Aave untuk menarik kembali uang pinjaman + bunga
        IERC20(asset).approve(address(POOL), totalDebt);
        
        return true;
    }

    function withdraw(address asset) external onlyOwner {
        uint256 bal = IERC20(asset).balanceOf(address(this));
        IERC20(asset).transfer(owner, bal);
    }

    function withdrawETH() external onlyOwner {
        uint256 bal = address(this).balance;
        payable(owner).transfer(bal);
    }

    // Untuk menerima ETH jika ada sisa swap kembalian dalam bentuk native
    receive() external payable {}
}