// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface Aave V3
interface IFlashLoanSimpleReceiver {
    /** * @dev Aave mengharapkan fungsi POOL() mengembalikan address.
     * Kita akan buat manual agar tidak bentrok dengan state variable.
     */
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
    
    // Kita hapus 'override' di sini untuk menghindari bentrok tipe data
    IPool public immutable poolContract; 
    address public immutable providerAddress;

    constructor(address _pool, address _router) {
        owner = msg.sender;
        poolContract = IPool(_pool);
        aeroRouter = _router;
        providerAddress = address(0); // Hanya formalitas interface
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    // --- FUNGSI MANDATORY DARI INTERFACE AAVE ---
    function POOL() external view override returns (address) {
        return address(poolContract);
    }

    function ADDRESSES_PROVIDER() external view override returns (address) {
        return providerAddress;
    }
    // --------------------------------------------

    function startArb(address asset, uint256 amount, bytes calldata params) external onlyOwner {
        poolContract.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(poolContract), "!pool");

        uint256 totalDebt = amount + premium;
        IAerodromeRouter.Route[] memory routes = abi.decode(params, (IAerodromeRouter.Route[]));

        IERC20(asset).approve(aeroRouter, amount);
        
        IAerodromeRouter(aeroRouter).swapExactTokensForTokens(
            amount, 
            totalDebt, 
            routes, 
            address(this), 
            block.timestamp + 15
        );

        require(IERC20(asset).balanceOf(address(this)) >= totalDebt, "RUGI!");
        IERC20(asset).approve(address(poolContract), totalDebt);
        
        return true;
    }

    function withdraw(address asset) external onlyOwner {
        IERC20(asset).transfer(owner, IERC20(asset).balanceOf(address(this)));
    }

    function withdrawETH() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}