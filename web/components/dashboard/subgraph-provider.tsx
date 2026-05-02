"use client";

import { Provider as UrqlProvider } from "urql";
import { subgraphClient } from "@/lib/subgraph/client";

const SubGraphProvider = ({ children }: { children: React.ReactNode }) => {
	return <UrqlProvider value={subgraphClient}>{children}</UrqlProvider>;
};

export default SubGraphProvider;
