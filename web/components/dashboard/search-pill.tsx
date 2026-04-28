import { Search } from "lucide-react";
import { Input } from "../ui/input";

function SearchPill({
	search,
	setSearch,
}: {
	search: string;
	setSearch: (value: string) => void;
}) {
	return (
		<div className="relative">
			<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder="Filter assets"
				className="h-11 w-[220px] rounded-full border-border bg-background/60 pl-11 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
			/>
		</div>
	);
}
export default SearchPill;
