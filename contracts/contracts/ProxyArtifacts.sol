// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract ProxyArtifacts {
    function proxyAdminType() external pure returns (string memory) {
        return type(ProxyAdmin).name;
    }

    function transparentProxyType() external pure returns (string memory) {
        return type(TransparentUpgradeableProxy).name;
    }
}
