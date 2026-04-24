"use client";

import { useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";

import type {
	AssetMarketSummary,
	Opportunity,
	OpportunitiesResponse,
	ProtocolRegistryEntry,
	Recommendation,
} from "./yieldpilot-types";

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
