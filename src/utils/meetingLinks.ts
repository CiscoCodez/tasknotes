const MEETING_URL_PATTERN = /https:\/\/[^\s<>"']+/gi;

export type MeetingProvider = "google-meet" | "zoom" | "teams";

export function getMeetingProvider(value: string): MeetingProvider | null {
	try {
		const host = new URL(value).hostname.toLowerCase();
		if (host === "meet.google.com") return "google-meet";
		if (host === "zoom.us" || host.endsWith(".zoom.us") || host.endsWith(".zoomgov.com")) {
			return "zoom";
		}
		if (host === "teams.microsoft.com" || host === "teams.live.com") return "teams";
	} catch {
		return null;
	}
	return null;
}

export function extractMeetingUrl(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value !== "string") continue;
		for (const match of value.replace(/&amp;/gi, "&").match(MEETING_URL_PATTERN) ?? []) {
			const candidate = match.replace(/[),.;]+$/, "");
			if (getMeetingProvider(candidate)) return candidate;
		}
	}
	return undefined;
}

export function getMeetingLaunchUrl(url: string, launchMode: "native" | "browser"): string {
	if (launchMode === "browser") return url;

	const provider = getMeetingProvider(url);
	const parsed = new URL(url);
	if (provider === "zoom") {
		const meetingId = parsed.pathname.match(/^\/(?:j|s)\/(\d+)/)?.[1];
		if (meetingId) {
			const query = new URLSearchParams({ action: "join", confno: meetingId });
			const password = parsed.searchParams.get("pwd");
			if (password) query.set("pwd", password);
			return `zoommtg://${parsed.hostname}/join?${query.toString()}`;
		}
	}
	if (provider === "teams" && parsed.hostname.toLowerCase() === "teams.microsoft.com") {
		return `msteams:${parsed.pathname}${parsed.search}${parsed.hash}`;
	}

	return url;
}
