import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { encodeFunctionData, parseUnits } from "viem";

import UpgradeYieldPilotVaultModule from "../ignition/modules/UpgradeYieldPilotVault.js";
import YieldPilotVaultModule from "../ignition/modules/YieldPilotVaultProxy.js";

describe("YieldPilotVault", async function () {
  const connection = await network.create();
  const { viem, ignition } = connection;
  const [owner, alice, bob] = await viem.getWalletClients();

  it("deploys through an Ignition transparent proxy and unwinds strategy liquidity on withdraw", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("25000", 6);
    const withdrawAmount = parseUnits("6250", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault, proxyAdmin } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-proxy-flow",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    assert.notEqual(proxyAdmin.address, "0x0000000000000000000000000000000000000000");

    const strategyOne = await viem.deployContract("MockStrategyAdapter", [asset.address]);
    const strategyTwo = await viem.deployContract("MockStrategyAdapter", [asset.address]);

    await strategyOne.write.setVault([vault.address]);
    await strategyTwo.write.setVault([vault.address]);

    await vault.write.whitelistStrategy([strategyOne.address]);
    await vault.write.whitelistStrategy([strategyTwo.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });

    await vault.write.deployToStrategy([strategyOne.address, parseUnits("11000", 6)]);
    await vault.write.deployToStrategy([strategyTwo.address, parseUnits("9000", 6)]);

    assert.equal(await vault.read.idleAssets(), parseUnits("5000", 6));
    assert.deepEqual(
      (await vault.read.activeStrategies()).map((address) => address.toLowerCase()),
      [strategyOne.address, strategyTwo.address].map((address) => address.toLowerCase())
    );
    assert.equal(await vault.read.totalStrategyAssets(), parseUnits("20000", 6));
    assert.equal(await strategyOne.read.totalAssets(), parseUnits("11000", 6));
    assert.equal(await strategyTwo.read.totalAssets(), parseUnits("9000", 6));

    const beforeBalance = await asset.read.balanceOf([alice.account.address]);

    await vault.write.withdraw([withdrawAmount, alice.account.address, alice.account.address], {
      account: alice.account,
    });

    const afterBalance = await asset.read.balanceOf([alice.account.address]);

    assert.equal(afterBalance - beforeBalance, withdrawAmount);
    assert.equal(await vault.read.idleAssets(), 0n);
    assert.equal(await strategyOne.read.totalAssets(), parseUnits("9750", 6));
    assert.equal(await strategyTwo.read.totalAssets(), parseUnits("9000", 6));
    assert.equal(await vault.read.totalAssets(), parseUnits("18750", 6));
    assert.equal(await vault.read.totalStrategyAssets(), parseUnits("18750", 6));
  });

  it("supports strategy accounting sync and blocks fresh deposits while paused", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("5000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-sync-and-pause",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategy = await viem.deployContract("MockStrategyAdapter", [asset.address]);
    await strategy.write.setVault([vault.address]);
    await vault.write.whitelistStrategy([strategy.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });
    await vault.write.deployToStrategy([strategy.address, parseUnits("3000", 6)]);

    await asset.write.mint([strategy.address, parseUnits("125", 6)]);
    await vault.write.syncStrategyAssets([strategy.address]);

    assert.equal(await vault.read.totalStrategyAssets(), parseUnits("3125", 6));
    assert.equal(await vault.read.totalAssets(), parseUnits("5125", 6));

    await vault.write.pause();

    await assert.rejects(
      vault.write.deposit([parseUnits("1", 6), alice.account.address], {
        account: alice.account,
      })
    );

    await vault.write.withdraw([parseUnits("500", 6), alice.account.address, alice.account.address], {
      account: alice.account,
    });
  });

  it("requires pausing before syncing realized strategy losses", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("5000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-loss-sync-guard",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategy = await viem.deployContract("MockStrategyAdapter", [asset.address]);
    await strategy.write.setVault([vault.address]);
    await vault.write.whitelistStrategy([strategy.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });
    await vault.write.deployToStrategy([strategy.address, parseUnits("3000", 6)]);

    await strategy.write.sweepLoss([owner.account.address, parseUnits("500", 6)]);

    await assert.rejects(
      vault.write.syncStrategyAssets([strategy.address]),
    );

    await vault.write.pause();
    await vault.write.syncStrategyAssets([strategy.address]);

    assert.equal(await vault.read.totalStrategyAssets(), parseUnits("2500", 6));
    assert.equal(await vault.read.totalAssets(), parseUnits("4500", 6));
  });

  it("uses the configured withdrawal queue order during unwind", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("10000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-withdrawal-queue-order",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategyOne = await viem.deployContract("MockStrategyAdapter", [asset.address]);
    const strategyTwo = await viem.deployContract("MockStrategyAdapter", [asset.address]);

    await strategyOne.write.setVault([vault.address]);
    await strategyTwo.write.setVault([vault.address]);
    await vault.write.whitelistStrategy([strategyOne.address]);
    await vault.write.whitelistStrategy([strategyTwo.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });

    await vault.write.deployToStrategy([strategyOne.address, parseUnits("4000", 6)]);
    await vault.write.deployToStrategy([strategyTwo.address, parseUnits("4000", 6)]);
    await vault.write.setWithdrawalQueue([[strategyTwo.address, strategyOne.address]]);

    assert.deepEqual(
      (await vault.read.withdrawalQueue()).map((address) => address.toLowerCase()),
      [strategyTwo.address, strategyOne.address].map((address) => address.toLowerCase())
    );

    await vault.write.withdraw([parseUnits("5000", 6), alice.account.address, alice.account.address], {
      account: alice.account,
    });

    assert.equal(await strategyTwo.read.totalAssets(), parseUnits("1000", 6));
    assert.equal(await strategyOne.read.totalAssets(), parseUnits("4000", 6));
  });

  it("blocks strategy callback reentry during deployment", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("5000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-reentrancy-guard",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategy = await viem.deployContract("ReentrantStrategyAdapter", [asset.address, owner.account.address]);
    await strategy.write.setVault([vault.address]);
    await strategy.write.setReentry([parseUnits("1000", 6), owner.account.address]);
    await vault.write.whitelistStrategy([strategy.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });

    await assert.rejects(
      vault.write.deployToStrategy([strategy.address, parseUnits("2000", 6)]),
    );
  });

  it("blocks strategy callback reentry during withdrawal unwinds", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("5000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-withdraw-reentrancy-guard",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategy = await viem.deployContract("ReentrantStrategyAdapter", [asset.address, alice.account.address]);
    await strategy.write.setVault([vault.address]);
    await vault.write.whitelistStrategy([strategy.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });
    await vault.write.deployToStrategy([strategy.address, parseUnits("3000", 6)]);

    await strategy.write.setRedeemReentry([parseUnits("1", 6), alice.account.address]);

    await assert.rejects(
      vault.write.withdraw([parseUnits("2500", 6), alice.account.address, alice.account.address], {
        account: alice.account,
      }),
    );
  });

  it("upgrades through the transparent proxy admin and preserves vault state", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("1000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault, proxy, proxyAdmin } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-upgrade-base",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });

    const implementationV2 = await viem.deployContract("YieldPilotVaultUpgradeMock");
    const initializeV2Data = encodeFunctionData({
      abi: implementationV2.abi,
      functionName: "initializeV2",
      args: [2_500],
    });

    await proxyAdmin.write.upgradeAndCall([proxy.address, implementationV2.address, initializeV2Data], {
      account: owner.account,
    });

    const upgradedVault = await viem.getContractAt("YieldPilotVaultUpgradeMock", proxy.address);

    assert.equal(await upgradedVault.read.version(), "2.0.0-test");
    assert.equal(await upgradedVault.read.reserveTargetBps(), 2_500);
    assert.equal(await upgradedVault.read.totalAssets(), depositAmount);
    assert.equal(await upgradedVault.read.balanceOf([alice.account.address]), depositAmount);
  });

  it("supports the dedicated Ignition upgrade module from the Hardhat guide pattern", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);

    const { upgradedVault } = await ignition.deploy(UpgradeYieldPilotVaultModule, {
      deploymentId: "vault-upgrade-module",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
        YieldPilotVaultUpgradeModule: {
          reserveTargetBps: 1_500n,
        },
      },
    });

    assert.equal(await upgradedVault.read.version(), "2.0.0-test");
    assert.equal(await upgradedVault.read.reserveTargetBps(), 1_500);
  });

  it("locks the implementation initializer", async function () {
    const implementation = await viem.deployContract("YieldPilotVault");
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);

    await assert.rejects(
      implementation.write.initialize([asset.address, "YieldPilot USDC Vault", "ypUSDC", owner.account.address]),
    );
  });

  it("rejects fee-on-transfer assets during deposit accounting", async function () {
    const asset = await viem.deployContract("FeeOnTransferERC20", ["Fee USD Coin", "fUSDC", 6, 100]);
    const depositAmount = parseUnits("1000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-fee-on-transfer-asset",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot Fee Vault",
          symbol: "ypFEE",
        },
      },
    });

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });

    await assert.rejects(
      vault.write.deposit([depositAmount, alice.account.address], {
        account: alice.account,
      }),
    );
  });

  it("rejects strategies that misreport deployed assets", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("5000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-misreporting-deploy-strategy",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategy = await viem.deployContract("MisreportingStrategyAdapter", [asset.address]);
    await strategy.write.setVault([vault.address]);
    await strategy.write.setOffsets([1n, 0n]);
    await vault.write.whitelistStrategy([strategy.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });

    await assert.rejects(
      vault.write.deployToStrategy([strategy.address, parseUnits("1000", 6)]),
    );
  });

  it("rejects strategies that misreport recalled assets", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);
    const depositAmount = parseUnits("5000", 6);

    await asset.write.mint([alice.account.address, depositAmount]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-misreporting-withdraw-strategy",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    const strategy = await viem.deployContract("MisreportingStrategyAdapter", [asset.address]);
    await strategy.write.setVault([vault.address]);
    await vault.write.whitelistStrategy([strategy.address]);

    await asset.write.approve([vault.address, depositAmount], {
      account: alice.account,
    });
    await vault.write.deposit([depositAmount, alice.account.address], {
      account: alice.account,
    });
    await vault.write.deployToStrategy([strategy.address, parseUnits("3000", 6)]);

    await strategy.write.setOffsets([0n, 1n]);

    await assert.rejects(
      vault.write.recallFromStrategy([strategy.address, parseUnits("1000", 6)]),
    );
  });

  it("uses two-step ownership transfers and blocks renouncing ownership", async function () {
    const asset = await viem.deployContract("MockERC20", ["Mock USD Coin", "mUSDC", 6]);

    const { vault } = await ignition.deploy(YieldPilotVaultModule, {
      deploymentId: "vault-two-step-ownership",
      parameters: {
        YieldPilotVaultProxyModule: {
          asset: asset.address,
          name: "YieldPilot USDC Vault",
          symbol: "ypUSDC",
        },
      },
    });

    await vault.write.transferOwnership([bob.account.address]);
    assert.equal((await vault.read.pendingOwner()).toLowerCase(), bob.account.address.toLowerCase());
    assert.equal((await vault.read.owner()).toLowerCase(), owner.account.address.toLowerCase());

    await assert.rejects(
      vault.write.acceptOwnership({
        account: alice.account,
      }),
    );

    await vault.write.acceptOwnership({
      account: bob.account,
    });

    assert.equal((await vault.read.owner()).toLowerCase(), bob.account.address.toLowerCase());
    assert.equal(await vault.read.pendingOwner(), "0x0000000000000000000000000000000000000000");

    await assert.rejects(
      vault.write.renounceOwnership({
        account: bob.account,
      }),
    );
  });
});
