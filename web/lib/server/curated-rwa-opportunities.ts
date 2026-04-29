import "server-only";

import type { Opportunity, ProtocolRegistryEntry } from "@/lib/yieldpilot-types";

type CuratedRwaOpportunityRegistry = {
	opportunities: Opportunity[];
	protocols: ProtocolRegistryEntry[];
};

// Intentionally empty today.
// Robinhood Chain stock tokens have registry + pricing support in Kabon,
// but we do not yet have real, whitelisted deployable venues to route them into.
// This file is the place to add them once the ecosystem has credible live venues.
const CURATED_RWA_REGISTRY: CuratedRwaOpportunityRegistry = {
	opportunities: [],
	protocols: [],
};

export function getCuratedRwaOpportunities() {
	return CURATED_RWA_REGISTRY.opportunities;
}

export function getCuratedRwaProtocols() {
	return CURATED_RWA_REGISTRY.protocols;
}
