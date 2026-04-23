import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const proxyModule = buildModule("YieldPilotVaultProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);
  const asset = m.getParameter("asset");
  const name = m.getParameter("name", "Kabon Vault Share");
  const symbol = m.getParameter("symbol", "ypVAULT");
  const feeRecipient = m.getParameter("feeRecipient", proxyAdminOwner);
  const unwindFeeBps = m.getParameter("unwindFeeBps", 500n);

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
  const vault = m.contractAt("YieldPilotVault", proxy, { id: "YieldPilotVaultProxyInstance" });

  m.call(vault, "setWithdrawalFee", [feeRecipient, unwindFeeBps], {
    from: proxyAdminOwner,
  });

  return { implementation, proxy, proxyAdmin, vault };
});

const vaultModule = buildModule("YieldPilotVaultModule", (m) => {
  const { implementation, proxy, proxyAdmin, vault } = m.useModule(proxyModule);

  return { implementation, proxy, proxyAdmin, vault };
});

export default vaultModule;
