import { createClient, Client, cacheExchange, fetchExchange } from "urql";

const SUBGRAPH_ENDPOINT =
	process.env.NEXT_PUBLIC_SUBGRAPH_ENDPOINT ||
	"https://api.studio.thegraph.com/query/1749198/kabon-vault/v0.0.1";

export const subgraphClient: Client = createClient({
	url: SUBGRAPH_ENDPOINT,
	exchanges: [cacheExchange, fetchExchange],
	requestPolicy: "cache-and-network",
});
