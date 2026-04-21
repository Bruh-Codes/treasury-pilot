import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const proxyModule = buildModule("YieldPilotVaultProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const asset = m.getParameter("asset");
  const name = m.getParameter("name", "YieldPilot Vault Share");
  const symbol = m.getParameter("symbol", "ypVAULT");

  const implementation = m.contract("YieldPilotVault");
  const initializeCall = m.encodeFunctionCall(implementation, "initialize", [
    asset,
    name,
    symbol,
    proxyAdminOwner,
  ]);

  const proxy = m.contract("TransparentUpgradeableProxy", [
    implementation,
    proxyAdminOwner,
    initializeCall,
  ]);

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { implementation, proxy, proxyAdmin };
});

const vaultModule = buildModule("YieldPilotVaultModule", (m) => {
  const { implementation, proxy, proxyAdmin } = m.useModule(proxyModule);
  const vault = m.contractAt("YieldPilotVault", proxy, { id: "YieldPilotVaultProxyInstance" });

  return { implementation, proxy, proxyAdmin, vault };
});

export default vaultModule;
