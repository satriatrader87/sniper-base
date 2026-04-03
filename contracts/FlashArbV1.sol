// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Jika pindah ke Uniswap, ganti interface IAerodromeRouter di bawah ini.
 */
interface IAerodromeRouter {
    struct Route { address from; address to; bool stable; }
    // Variabel 'in' sudah diganti jadi 'amountIn'
    function swapExactTokensForTokens(uint amountIn, uint outMin, Route[] calldata r, address to, uint d) external returns (uint[] memory a);
}

contract FlashArbV1 is FlashLoanSimpleReceiverBase {
    address public immutable owner;
    address public immutable aeroRouter;

    constructor(address _provider, address _router) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_provider)) {
        owner = msg.sender;
        aeroRouter = _router;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    function startArb(address asset, uint256 amount, bytes calldata params) external onlyOwner {
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    function executeOperation(address asset, uint256 amount, uint256 premium, address, bytes calldata params) external override returns (bool) {
        uint256 totalDebt = amount + premium;
        IAerodromeRouter.Route[] memory routes = abi.decode(params, (IAerodromeRouter.Route[]));

        IERC20(asset).approve(aeroRouter, amount);
        
        // Proteksi Revert jika profit tidak menutupi hutang
        IAerodromeRouter(aeroRouter).swapExactTokensForTokens(
            amount, totalDebt, routes, address(this), block.timestamp + 15
        );

        require(IERC20(asset).balanceOf(address(this)) >= totalDebt, "RUGI!");
        IERC20(asset).approve(address(POOL), totalDebt);
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