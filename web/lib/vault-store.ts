"use client";

import { useSyncExternalStore } from "react";
import {
	type Allocation,
	type LiquidityPreset,
	type Recommendation,
	type RiskPreset,
	STRATEGIES,
} from "./yieldpilot-data";

type VaultState = {
	connected: boolean;
	address: string | null;
	walletUsdc: number;
	vaultBalance: number;
	policy: {
		risk: RiskPreset;
		liquidity: LiquidityPreset;
		perStrategyMax: number;
	} | null;
	allocations: Allocation[]; // current applied allocations
	pendingRecommendation: Recommendation | null;
	pendingWithdraw: { amount: number; eta: string } | null;
	history: { ts: number; label: string }[];
};

const STORAGE_KEY = "yieldpilot:state:v1";

function load(): VaultState {
	if (typeof window === "undefined") return defaultState();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		return { ...defaultState(), ...JSON.parse(raw) };
	} catch {
		return defaultState();
	}
}

function defaultState(): VaultState {
	return {
		connected: false,
		address: null,
		walletUsdc: 25000,
		vaultBalance: 0,
		policy: null,
		allocations: [],
		pendingRecommendation: null,
		pendingWithdraw: null,
		history: [],
	};
}

let state: VaultState = load();
const listeners = new Set<() => void>();

function persist() {
	if (typeof window !== "undefined") {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}
	listeners.forEach((l) => l());
}

function set(updater: (s: VaultState) => VaultState) {
	state = updater(state);
	persist();
}

function shortenAddress(address: string) {
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function pushHistory(label: string) {
	state.history = [{ ts: Date.now(), label }, ...state.history].slice(0, 20);
}

export const vaultStore = {
	get: () => state,
	subscribe: (fn: () => void) => {
		listeners.add(fn);
		return () => listeners.delete(fn);
	},
	connect() {
		set((s) => ({
			...s,
			connected: true,
			address: "0x8F3a…C2E7",
		}));
	},
	disconnect() {
		set((s) => ({ ...s, connected: false, address: null }));
	},
	syncWallet(address: string | null) {
		set((s) => ({
			...s,
			connected: Boolean(address),
			address: address ? shortenAddress(address) : null,
		}));
	},
	setPolicy(policy: NonNullable<VaultState["policy"]>) {
		set((s) => {
			pushHistory(`Policy set: ${policy.risk} · ${policy.liquidity}`);
			return { ...s, policy };
		});
	},
	deposit(amount: number) {
		set((s) => {
			pushHistory(`Deposited ${amount.toLocaleString()} USDC`);
			return {
				...s,
				walletUsdc: s.walletUsdc - amount,
				vaultBalance: s.vaultBalance + amount,
				allocations:
					s.allocations.length === 0
						? [{ strategyId: "idle", percent: 1 }]
						: s.allocations,
			};
		});
	},
	setRecommendation(rec: Recommendation | null) {
		set((s) => ({ ...s, pendingRecommendation: rec }));
	},
	approveRecommendation() {
		set((s) => {
			if (!s.pendingRecommendation) return s;
			pushHistory("Allocation executed");
			return {
				...s,
				allocations: s.pendingRecommendation.allocations,
				pendingRecommendation: null,
			};
		});
	},
	withdraw(amount: number) {
		set((s) => {
			const idle = s.allocations.find((a) => a.strategyId === "idle");
			const idleUsd = (idle?.percent ?? 0) * s.vaultBalance;
			const fromIdle = Math.min(idle ? idleUsd : 0, amount);
			const needsUnwind = amount - fromIdle;

			const newVault = s.vaultBalance - fromIdle;
			const newWallet = s.walletUsdc + fromIdle;

			// recompute idle percent
			let newAllocs = s.allocations.map((a) =>
				a.strategyId === "idle"
					? {
							...a,
							percent: newVault > 0 ? (idleUsd - fromIdle) / newVault : 0,
						}
					: {
							...a,
							percent:
								newVault > 0 ? (a.percent * s.vaultBalance) / newVault : 0,
						},
			);
			// normalize
			const total = newAllocs.reduce((a, b) => a + b.percent, 0);
			if (total > 0)
				newAllocs = newAllocs.map((a) => ({
					...a,
					percent: a.percent / total,
				}));

			pushHistory(`Withdrew ${fromIdle.toLocaleString()} USDC from idle`);

			return {
				...s,
				vaultBalance: newVault,
				walletUsdc: newWallet,
				allocations: newAllocs,
				pendingWithdraw:
					needsUnwind > 0
						? { amount: needsUnwind, eta: "~12 hours" }
						: s.pendingWithdraw,
			};
		});
	},
	finalizeUnwind() {
		set((s) => {
			if (!s.pendingWithdraw) return s;
			const amount = Math.min(s.pendingWithdraw.amount, s.vaultBalance);
			pushHistory(`Unwound ${amount.toLocaleString()} USDC and sent to wallet`);
			return {
				...s,
				vaultBalance: s.vaultBalance - amount,
				walletUsdc: s.walletUsdc + amount,
				allocations: [{ strategyId: "idle", percent: 1 }],
				pendingWithdraw: null,
			};
		});
	},
	reset() {
		state = defaultState();
		persist();
	},
};

// Cache the server snapshot to avoid infinite loop
const serverSnapshot = defaultState();

export function useVault() {
	return useSyncExternalStore(
		vaultStore.subscribe,
		() => state,
		() => serverSnapshot,
	);
}

export function deployedValue(s: ReturnType<typeof vaultStore.get>) {
	const idle = s.allocations.find((a) => a.strategyId === "idle");
	return s.vaultBalance * (1 - (idle?.percent ?? 0));
}

export function idleValue(s: ReturnType<typeof vaultStore.get>) {
	const idle = s.allocations.find((a) => a.strategyId === "idle");
	return s.vaultBalance * (idle?.percent ?? 0);
}

export function allocatedStrategies(s: ReturnType<typeof vaultStore.get>) {
	return s.allocations
		.filter((a) => a.strategyId !== "idle" && a.percent > 0.001)
		.map((a) => ({
			...a,
			strategy: STRATEGIES.find((x) => x.id === a.strategyId)!,
			usd: a.percent * s.vaultBalance,
		}));
}
