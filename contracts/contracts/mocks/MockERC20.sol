// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Mock ERC20
/// @notice Mintable ERC-20 token used by the test suite to model supported vault assets.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    /// @param decimals_ Token decimals.
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    /// @notice Returns the configured token decimals.
    /// @return The decimal precision for the token.
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mints tokens for tests and local deployments.
    /// @param to Recipient address.
    /// @param amount Amount to mint.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
