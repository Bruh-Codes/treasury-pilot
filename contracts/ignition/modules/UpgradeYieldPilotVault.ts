import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import YieldPilotVaultModule from "./YieldPilotVaultProxy.js";

const upgradeModule = buildModule("YieldPilotVaultUpgradeModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const reserveTargetBps = m.getParameter("reserveTargetBps", 2_000n);
  const { proxyAdmin, proxy } = m.useModule(YieldPilotVaultModule);

  const implementationV2 = m.contract("YieldPilotVaultUpgradeMock");
  const initializeCall = m.encodeFunctionCall(implementationV2, "initializeV2", [
    reserveTargetBps,
  ]);

  m.call(proxyAdmin, "upgradeAndCall", [proxy, implementationV2, initializeCall], {
    from: proxyAdminOwner,
  });

  const upgradedVault = m.contractAt("YieldPilotVaultUpgradeMock", proxy, {
    id: "YieldPilotVaultUpgradeMockProxyInstance",
  });

  return { proxyAdmin, proxy, implementationV2, upgradedVault };
});

export default upgradeModule;
