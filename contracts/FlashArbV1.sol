// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface minimal Aave Pool
interface IPool {
    function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external;
}

interface IAerodromeRouter {
    struct Route { address from; address to; bool stable; }
    function swapExactTokensForTokens(uint amountIn, uint outMin, Route[] calldata r, address to, uint d) external returns (uint[] memory a);
}

contract FlashArbV1 {
    address public immutable owner;
    address public immutable aeroRouter;
    IPool public immutable POOL;

    constructor(address _pool, address _router) {
        owner = msg.sender;
        POOL = IPool(_pool);
        aeroRouter = _router;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }

    function startArb(address asset, uint256 amount, bytes calldata params) external onlyOwner {
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    // Fungsi ini dipanggil oleh Aave
    function executeOperation(address asset, uint256 amount, uint256 premium, address, bytes calldata params) external returns (bool) {
        require(msg.sender == address(POOL), "!pool");
        uint256 totalDebt = amount + premium;
        IAerodromeRouter.Route[] memory routes = abi.decode(params, (IAerodromeRouter.Route[]));

        IERC20(asset).approve(aeroRouter, amount);
        
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