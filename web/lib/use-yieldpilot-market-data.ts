"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getBalance, readContracts } from "@wagmi/core";
import { formatUnits, type Address, erc20Abi } from "viem";

import type {
  AssetRegistryEntry,
  AssetMarketSummary,
  Opportunity,
  OpportunitiesResponse,
  ProtocolRegistryEntry,
  Recommendation,
} from "./yieldpilot-types";
import { wagmiConfig } from "./reown";
import { yieldPilotVaultAbi } from "./vault-abi";

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export type TokenPriceMap = Record<string, number | null>;
export type TokenHistoryMap = Record<
  string,
  Array<{ timestamp: number; priceUsd: number }>
>;
export type MultichainTrackedAsset = {
  key: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  isNative?: boolean;
  tokenAddress?: Address;
};
export type MultichainBalanceMap = Record<
  string,
  { balance: number; chainId: number; symbol: string }
>;
export type MultichainVaultPosition = {
  key: string;
  chainId: number;
  symbol: string;
  vaultAddress: Address;
  tokenDecimals: number;
};
export type MultichainVaultPositionMap = Record<
  string,
  { shares: number; assets: number; chainId: number; symbol: string }
>;
export type CopilotAssetInput = {
  id: string;
  name: string;
  symbol: string;
  chainId: number;
  chainLabel: string;
  balance: number;
  depositedBalance: number;
  valueUsd: number | null;
  unitPriceUsd: number | null;
  supported: boolean;
  apy: string;
  totalDeposits: string;
  availableLiquidity: string;
};
export type CopilotAnalysisItem = {
  assetId: string;
  name: string;
  symbol: string;
  chainLabel: string;
  balance: number;
  depositedBalance: number;
  valueUsd: number | null;
  unitPriceUsd: number | null;
  status: "actionable" | "hold" | "blocked" | "error";
  label: string;
  summary: string;
  decisionTitle: string;
  confidence: "high" | "medium" | "low";
  expectedApy: number;
  protocolName: string | null;
  rationale: string;
  factors: string[];
  risks: string[];
  warnings: string[];
  nextAction: string;
};
export type CopilotPolicyPreset = "conservative" | "balanced" | "yield";
export type CopilotAgentStep = {
  title: string;
  description: string;
  status: "complete" | "ready" | "blocked";
};
export type CopilotAnalysisResponse = {
  mode: "portfolio" | "asset";
  policy: CopilotPolicyPreset;
  title: string;
  subtitle: string;
  narrative: string;
  headline: string;
  drivers: string[];
  cautions: string[];
  nextAction: string;
  agentSteps: CopilotAgentStep[];
  bestOpportunity: CopilotAnalysisItem | null;
  items: CopilotAnalysisItem[];
  generatedAt: string;
  source: "openai" | "fallback";
};

export function useAssetSummaries() {
  return useQuery({
    queryKey: ["yieldpilot", "assets"],
    queryFn: () =>
      fetchJson<{ assets: AssetMarketSummary[]; generatedAt: string }>(
        "/api/assets",
      ),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAssetRegistry() {
  return useQuery({
    queryKey: ["yieldpilot", "asset-registry"],
    queryFn: () =>
      fetchJson<{ assets: AssetRegistryEntry[]; generatedAt: string }>(
        "/api/asset-registry",
      ),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useGreeting() {
  const timezone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;
  const suffix =
    typeof timezone === "string" && timezone.length > 0
      ? `?timezone=${encodeURIComponent(timezone)}`
      : "";

  return useQuery({
    queryKey: ["yieldpilot", "greeting", timezone ?? "unknown"],
    queryFn: () =>
      fetchJson<{
        greeting: string;
        timezone: string;
        source: "browser-timezone" | "vercel-header" | "ipapi" | "utc-fallback";
        generatedAt: string;
      }>(`/api/greeting${suffix}`),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useTokenPrices(symbols: string[]) {
  const normalizedSymbols = Array.from(
    new Set(
      symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
    ),
  ).sort();
  const searchParams = new URLSearchParams();
  if (normalizedSymbols.length > 0) {
    searchParams.set("symbols", normalizedSymbols.join(","));
  }

  return useQuery({
    queryKey: ["yieldpilot", "token-prices", normalizedSymbols.join(",")],
    queryFn: () =>
      fetchJson<{ prices: TokenPriceMap; generatedAt: string }>(
        `/api/token-prices${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
      ),
    enabled: normalizedSymbols.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useTokenHistory(symbols: string[], range: string) {
  const normalizedSymbols = Array.from(
    new Set(
      symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
    ),
  ).sort();
  const searchParams = new URLSearchParams();
  if (normalizedSymbols.length > 0) {
    searchParams.set("symbols", normalizedSymbols.join(","));
  }
  searchParams.set("range", range);

  return useQuery({
    queryKey: [
      "yieldpilot",
      "token-history",
      normalizedSymbols.join(","),
      range,
    ],
    queryFn: () =>
      fetchJson<{ history: TokenHistoryMap; generatedAt: string }>(
        `/api/token-history?${searchParams.toString()}`,
      ),
    enabled: normalizedSymbols.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useMultichainBalances(
  address: Address | undefined,
  assets: MultichainTrackedAsset[],
) {
  const assetKey = assets
    .map((asset) => `${asset.key}:${asset.chainId}:${asset.symbol}`)
    .sort()
    .join("|");

  return useQuery({
    queryKey: ["yieldpilot", "multichain-balances", address, assetKey],
    enabled: Boolean(address) && assets.length > 0,
    queryFn: async () => {
      if (!address) {
        return { balances: {} as MultichainBalanceMap };
      }

      const balances: MultichainBalanceMap = {};
      const nativeAssets = assets.filter((asset) => asset.isNative);
      const tokenAssets = assets.filter(
        (asset) => !asset.isNative && asset.tokenAddress,
      );

      const nativeResults = await Promise.all(
        nativeAssets.map(async (asset) => {
          try {
            const balance = await getBalance(wagmiConfig, {
              address,
              chainId: asset.chainId,
            });
            return [
              asset.key,
              {
                balance: Number(formatUnits(balance.value, balance.decimals)),
                chainId: asset.chainId,
                symbol: asset.symbol,
              },
            ] as const;
          } catch {
            return null;
          }
        }),
      );

      for (const result of nativeResults) {
        if (!result) continue;
        balances[result[0]] = result[1];
      }

      if (tokenAssets.length > 0) {
        const results = await readContracts(wagmiConfig, {
          allowFailure: true,
          contracts: tokenAssets.map((asset) => ({
            chainId: asset.chainId,
            address: asset.tokenAddress as Address,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [address] as const,
          })),
        });

        tokenAssets.forEach((asset, index) => {
          const result = results[index];
          if (!result || result.status !== "success") return;
          balances[asset.key] = {
            balance: Number(formatUnits(result.result, asset.decimals)),
            chainId: asset.chainId,
            symbol: asset.symbol,
          };
        });
      }

      return { balances };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useMultichainVaultPositions(
  address: Address | undefined,
  positions: MultichainVaultPosition[],
) {
  const positionKey = positions
    .map(
      (position) =>
        `${position.key}:${position.chainId}:${position.symbol}:${position.vaultAddress}`,
    )
    .sort()
    .join("|");

  return useQuery({
    queryKey: [
      "yieldpilot",
      "multichain-vault-positions",
      address,
      positionKey,
    ],
    enabled: Boolean(address) && positions.length > 0,
    queryFn: async () => {
      if (!address) {
        return { positions: {} as MultichainVaultPositionMap };
      }

      const shareBalances = await readContracts(wagmiConfig, {
        allowFailure: true,
        contracts: positions.map((position) => ({
          chainId: position.chainId,
          address: position.vaultAddress,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [address] as const,
        })),
      });

      const assetValues = await readContracts(wagmiConfig, {
        allowFailure: true,
        contracts: positions.map((position, index) => {
          const shareResult = shareBalances[index];
          const shares =
            shareResult && shareResult.status === "success"
              ? shareResult.result
              : 0n;

          return {
            chainId: position.chainId,
            address: position.vaultAddress,
            abi: yieldPilotVaultAbi,
            functionName: "previewRedeem" as const,
            args: [shares] as const,
          };
        }),
      });

      const next: MultichainVaultPositionMap = {};
      positions.forEach((position, index) => {
        const shareResult = shareBalances[index];
        const assetResult = assetValues[index];
        const rawShares =
          shareResult && shareResult.status === "success"
            ? shareResult.result
            : 0n;
        const rawAssets =
          assetResult && assetResult.status === "success"
            ? assetResult.result
            : 0n;

        next[position.key] = {
          shares: Number(formatUnits(rawShares, position.tokenDecimals)),
          assets: Number(formatUnits(rawAssets, position.tokenDecimals)),
          chainId: position.chainId,
          symbol: position.symbol,
        };
      });

      return { positions: next };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useProtocols(asset?: string) {
  const suffix = asset ? `?asset=${asset}` : "";
  return useQuery({
    queryKey: ["yieldpilot", "protocols", asset ?? "all"],
    queryFn: () =>
      fetchJson<{ protocols: ProtocolRegistryEntry[]; generatedAt: string }>(
        `/api/protocols${suffix}`,
      ),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useOpportunities(
  asset?: string,
  protocol?: string,
  page = 1,
  pageSize = 10,
  range = "1W",
) {
  const searchParams = new URLSearchParams();
  if (asset) {
    searchParams.set("asset", asset);
  }
  if (protocol) {
    searchParams.set("protocol", protocol);
  }
  searchParams.set("page", page.toString());
  searchParams.set("pageSize", pageSize.toString());
  searchParams.set("range", range);

  const suffix = searchParams.toString();
  return useQuery({
    queryKey: [
      "yieldpilot",
      "opportunities",
      asset ?? "all",
      protocol ?? "all",
      page,
      pageSize,
      range,
    ],
    queryFn: () =>
      fetchJson<OpportunitiesResponse>(
        `/api/opportunities${suffix ? "?" + suffix : ""}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export async function fetchRecommendation(input: {
  asset: string;
  amount: number;
  riskProfile: "conservative" | "balanced" | "yield";
  liquidityPreference: "instant" | "weekly" | "flexible";
  allowedProtocols?: string[];
}) {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(json?.detail ?? "Failed to generate recommendation");
  }

  return (await response.json()) as {
    asset: string;
    amount: number;
    recommendation: Recommendation;
  };
}

export function useRecommendationMutation() {
  return useMutation({
    mutationFn: fetchRecommendation,
  });
}

export async function fetchCopilotAnalysis(input: {
  mode: "portfolio" | "asset";
  policy: CopilotPolicyPreset;
  assets: CopilotAssetInput[];
  focusAssetId?: string;
}) {
  const response = await fetch("/api/copilot-analysis", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(json?.detail ?? "Failed to analyze assets");
  }

  return (await response.json()) as CopilotAnalysisResponse;
}

export function useCopilotAnalysisMutation() {
  return useMutation({
    mutationFn: fetchCopilotAnalysis,
  });
}

export function useYieldpilotQueryClient() {
  return useQueryClient();
}
