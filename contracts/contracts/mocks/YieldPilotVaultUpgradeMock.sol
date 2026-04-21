// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {YieldPilotVault} from "../YieldPilotVault.sol";

/// @title YieldPilotVaultUpgradeMock
/// @notice Test-only upgrade target used to prove transparent proxy upgrades and state preservation.
contract YieldPilotVaultUpgradeMock is YieldPilotVault {
    uint16 public reserveTargetBps;

    event ReserveTargetUpdated(uint16 reserveTargetBps);

    /// @notice Second-stage initializer executed during the mock upgrade flow.
    /// @param reserveTargetBps_ Target idle reserve expressed in basis points.
    function initializeV2(uint16 reserveTargetBps_) external reinitializer(2) {
        reserveTargetBps = reserveTargetBps_;
        emit ReserveTargetUpdated(reserveTargetBps_);
    }

    /// @notice Returns the upgraded mock implementation version string.
    /// @return The mock V2 version identifier.
    function version() external pure override returns (string memory) {
        return "2.0.0-test";
    }
}
