// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title FeeOnTransferERC20
/// @notice Test token that burns a fee from every transfer to model unsupported assets.
contract FeeOnTransferERC20 is ERC20 {
    uint8 private immutable _decimals;
    uint16 private immutable _feeBps;

    constructor(string memory name_, string memory symbol_, uint8 decimals_, uint16 feeBps_) ERC20(name_, symbol_) {
        _decimals = decimals_;
        _feeBps = feeBps_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0) || _feeBps == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * _feeBps) / 10_000;
        uint256 received = value - fee;

        super._update(from, to, received);
        if (fee != 0) {
            super._update(from, address(0), fee);
        }
    }
}
