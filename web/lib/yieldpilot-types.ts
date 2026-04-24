export type RiskPreset = "conservative" | "balanced" | "yield";
export type LiquidityPreset = "instant" | "weekly" | "flexible";
export type AssetRegistryStatus = "discovered" | "reviewed" | "whitelisted";
export type AssetRegistryType =
  | "stablecoin"
  | "wrapped-native"
  | "governance"
  | "tokenized-equity"
  | "etf"
  | "rwa"
  | "other";

export type StrategyLiquidity = "Instant" | "1-3 days" | "7 days" | "Flexible";
export type StrategyRisk = "Low" | "Medium" | "Medium-High" | "High";

export type StrategySnapshot = {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  apy: number;
  liquidity: StrategyLiquidity;
  risk: StrategyRisk;
  riskScore: number;
  description: string;
  logoUrl?: string;
  projectUrl?: string;
  adapterAvailable: boolean;
};

export type Allocation = {
  strategyId: string;
  percent: number;
  strategy: StrategySnapshot;
};

export type Recommendation = {
  allocations: Allocation[];
  expectedApy: number;
  riskScore: number;
  rationale: string;
  warnings: string[];
  protocolUniverseCount?: number;
  generatedAt?: string;
};

export type ProtocolRegistryEntry = {
  id: string;
  name: string;
  slug: string;
  category: string;
  url?: string;
  logo?: string;
  tvl: number;
  opportunityCount: number;
  supportedAssets: string[];
  averageApy: number;
  maxApy: number;
  liquidityLabel: StrategyLiquidity;
  risk: StrategyRisk;
  riskScore: number;
  adapterAvailable: boolean;
};

export type HistoricalPoint = {
  timestamp: string;
  apy: number;
  tvlUsd: number;
};

export type Opportunity = {
  id: string;
  protocolId: string;
  protocolName: string;
  protocolSlug: string;
  category: string;
  assetSymbol: string;
  assetDisplayName: string;
  apy: number;
  apyBase?: number | null;
  apyReward?: number | null;
  tvlUsd: number;
  stablecoin: boolean;
  chain: string;
  pool: string;
  poolSymbol: string;
  poolMeta?: string | null;
  liquidityLabel: StrategyLiquidity;
  liquidityScore: number;
  risk: StrategyRisk;
  riskScore: number;
  url?: string;
  logo?: string;
  adapterAvailable: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  description: string;
  history?: HistoricalPoint[];
};

export type MarketSummary = {
  totalTvlUsd: number;
  averageApy: number;
  withdrawableTvlUsd: number;
  instantLiquidityUsd: number;
  instantVenueCount: number;
  adapterReadyCount: number;
  withdrawEnabledCount: number;
  primaryLiquidityLabel: string;
  primaryRisk: string;
};

export type OpportunitiesResponse = {
  opportunities: Opportunity[];
  total: number;
  page: number;
  pageSize: number;
  summary: MarketSummary;
  topOpportunities: Opportunity[];
  generatedAt: string;
};

export type AssetMarketSummary = {
  symbol: string;
  name: string;
  iconUrl?: string;
  protocolCount: number;
  topApy: number;
  averageApy: number;
  totalTvlUsd: number;
  availableLiquidityUsd: number;
  supported: boolean;
  chain?: string;
  address?: string;
  decimals?: number;
  assetType?: AssetRegistryType;
  status?: AssetRegistryStatus;
  reviewed?: boolean;
  recommendationEnabled?: boolean;
  executionEnabled?: boolean;
  depositEnabled?: boolean;
  sourceOfTruthUrl?: string;
  issuer?: string;
  notes?: string;
};

export type AssetRegistryEntry = {
  id?: number;
  chainId: number;
  chainKey: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  assetType: AssetRegistryType;
  status: AssetRegistryStatus;
  isReviewed: boolean;
  recommendationEnabled: boolean;
  executionEnabled: boolean;
  depositEnabled: boolean;
  hasTransferRestrictions: boolean;
  canBeFrozen: boolean;
  isCanonical: boolean;
  issuer?: string | null;
  sourceOfTruthUrl?: string | null;
  iconUrl?: string | null;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};
