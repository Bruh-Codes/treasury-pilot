export type RiskPreset = "conservative" | "balanced" | "yield";
export type LiquidityPreset = "instant" | "weekly" | "flexible";

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
};
