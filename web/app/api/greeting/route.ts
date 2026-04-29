import { NextRequest, NextResponse } from "next/server";

type GreetingResponse = {
	greeting: string;
	timezone: string;
	source: "browser-timezone" | "vercel-header" | "ipapi" | "utc-fallback";
	generatedAt: string;
};

function getGreetingForTimezone(timezone: string, now: Date) {
	const hour = Number(
		new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			hour: "numeric",
			hourCycle: "h23",
		})
			.formatToParts(now)
			.find((part) => part.type === "hour")?.value ?? "12",
	);

	if (hour < 12) {
		return "Good morning";
	}

	if (hour < 18) {
		return "Good afternoon";
	}

	return "Good evening";
}

function isValidTimezone(timezone: string | null): timezone is string {
	if (!timezone) return false;

	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

function getClientIp(request: NextRequest) {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0]?.trim();
	}

	return request.headers.get("x-real-ip")?.trim() ?? null;
}

function isPublicIp(ip: string | null) {
	if (!ip) return false;
	if (ip === "::1" || ip === "127.0.0.1") return false;
	if (ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
	if (ip.startsWith("172.")) {
		const secondOctet = Number(ip.split(".")[1] ?? "-1");
		if (secondOctet >= 16 && secondOctet <= 31) return false;
	}
	return true;
}

export async function GET(request: NextRequest) {
	const now = new Date();
	const browserTimezone = request.nextUrl.searchParams.get("timezone");
	if (isValidTimezone(browserTimezone)) {
		return NextResponse.json<GreetingResponse>({
			greeting: getGreetingForTimezone(browserTimezone, now),
			timezone: browserTimezone,
			source: "browser-timezone",
			generatedAt: now.toISOString(),
		});
	}

	const vercelTimezone = request.headers.get("x-vercel-ip-timezone");
	if (vercelTimezone) {
		return NextResponse.json<GreetingResponse>({
			greeting: getGreetingForTimezone(vercelTimezone, now),
			timezone: vercelTimezone,
			source: "vercel-header",
			generatedAt: now.toISOString(),
		});
	}

	const clientIp = getClientIp(request);
	if (isPublicIp(clientIp)) {
		try {
			const response = await fetch(
				`https://ipapi.co/${encodeURIComponent(clientIp ?? "")}/timezone/`,
				{
					headers: {
						accept: "text/plain",
					},
					next: {
						revalidate: 300,
					},
				},
			);

			if (response.ok) {
				const timezone = (await response.text()).trim();
				if (timezone.includes("/")) {
					return NextResponse.json<GreetingResponse>({
						greeting: getGreetingForTimezone(timezone, now),
						timezone,
						source: "ipapi",
						generatedAt: now.toISOString(),
					});
				}
			}
		} catch {
			// Fall through to UTC fallback.
		}
	}

	return NextResponse.json<GreetingResponse>({
		greeting: getGreetingForTimezone("UTC", now),
		timezone: "UTC",
		source: "utc-fallback",
		generatedAt: now.toISOString(),
	});
}
