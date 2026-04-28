import { Card, CardContent, CardHeader } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

function DashboardPageSkeleton() {
	return (
		<div className="px-0 pb-12">
			<div className="px-5 pt-8 md:px-8">
				<div className="flex flex-col gap-8">
					<div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
						<div className="flex flex-col gap-5">
							<div>
								<Skeleton className="h-[34px] w-[200px] md:w-[280px]" />
							</div>

							<div>
								<Skeleton className="h-[44px] w-[180px] md:w-[240px]" />
								<div className="mt-1 flex items-center gap-1.5">
									<Skeleton className="h-4 w-[100px]" />
									<Skeleton className="size-3.5 rounded-full" />
								</div>
							</div>

							<div className="border-t border-border pt-4">
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5">
										<Skeleton className="h-4 w-[100px]" />
										<Skeleton className="size-3.5 rounded-full" />
									</div>
									<Skeleton className="h-5 w-8 rounded-full" />
								</div>
								<div className="flex items-center justify-between py-2.5 text-sm">
									<div className="flex items-center gap-1.5">
										<Skeleton className="h-4 w-[100px]" />
										<Skeleton className="size-3.5 rounded-full" />
									</div>
									<Skeleton className="h-5 w-8 rounded-full" />
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-center justify-end gap-3">
								<Skeleton className="h-12 w-[120px] rounded-full" />
								<Skeleton className="h-12 w-[120px] rounded-full" />
							</div>

							<Card className="rounded-[24px] border-border bg-card/95 p-0">
								<CardContent className="p-0">
									<div className="flex flex-col gap-3 px-4 py-4 md:px-5">
										<div className="flex items-center justify-between gap-4">
											<div className="flex flex-col gap-2">
												<Skeleton className="h-5 w-[140px]" />
												<Skeleton className="h-4 w-[280px] md:w-[340px]" />
											</div>
										</div>
									</div>
									<div className="px-3 pb-3 md:px-4 md:pb-4">
										<div className="rounded-[20px] border border-border/70 px-4 py-5">
											<div className="flex h-[240px] flex-col justify-between">
												{Array.from({ length: 4 }).map((_, index) => (
													<Skeleton
														key={index}
														className="h-px w-full rounded-full"
													/>
												))}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<Card className="rounded-[28px] border-border bg-card/90 py-0 shadow-[0_20px_80px_rgba(0,0,0,0.32)]">
						<CardHeader className="gap-5 border-b border-border px-5 py-5 md:px-8">
							<div className="flex flex-col gap-2">
								<Skeleton className="h-8 w-[180px]" />
								<Skeleton className="h-4 w-[400px] md:w-[500px]" />
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<Skeleton className="h-11 w-[220px] rounded-full" />
							</div>
						</CardHeader>

						<div className="px-6 py-4">
							<div
								className="border-b border-border/30 bg-muted/15 px-0 py-3"
								style={{
									display: "grid",
									gridTemplateColumns:
										"240px minmax(92px,1fr) minmax(92px,1fr) minmax(72px,1fr) minmax(116px,1fr) minmax(120px,1fr) minmax(138px,1fr) 52px",
									columnGap: "10px",
								}}
							>
								{Array.from({ length: 7 }).map((_, index) => (
									<Skeleton key={index} className="h-4 w-16 rounded-full" />
								))}
							</div>
						</div>
						<div className="divide-y divide-border/20">
							{Array.from({ length: 8 }).map((_, rowIndex) => (
								<div
									key={rowIndex}
									className="px-0 py-4"
									style={{
										display: "grid",
										gridTemplateColumns:
											"240px minmax(92px,1fr) minmax(92px,1fr) minmax(72px,1fr) minmax(116px,1fr) minmax(120px,1fr) minmax(138px,1fr) 52px",
										columnGap: "10px",
									}}
								>
									<div className="flex items-center gap-3">
										<Skeleton className="size-11 rounded-full" />
										<div className="min-w-0">
											<Skeleton className="h-5 w-28 rounded-full" />
											<Skeleton className="mt-2 h-4 w-16 rounded-full" />
										</div>
									</div>
									<Skeleton className="h-5 w-20 self-center rounded-full" />
									<Skeleton className="h-5 w-16 self-center rounded-full" />
									<Skeleton className="h-5 w-20 self-center rounded-full" />
									<Skeleton className="h-5 w-24 self-center rounded-full" />
									<Skeleton className="h-5 w-28 self-center rounded-full" />
									<div className="flex justify-end">
										<Skeleton className="size-9 rounded-full" />
									</div>
								</div>
							))}
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}

export default DashboardPageSkeleton;
