import {
	extractMeetingUrl,
	getMeetingLaunchUrl,
	getMeetingProvider,
} from "../../../src/utils/meetingLinks";

describe("meetingLinks", () => {
	it.each([
		["https://meet.google.com/abc-defg-hij", "google-meet"],
		["https://company.zoom.us/j/123456789?pwd=secret", "zoom"],
		["https://teams.microsoft.com/l/meetup-join/abc", "teams"],
	])("recognizes %s", (url, provider) => {
		expect(getMeetingProvider(url)).toBe(provider);
	});

	it("extracts recognized meeting links from calendar text", () => {
		expect(
			extractMeetingUrl(
				"Agenda: https://calendar.google.com/event?id=1",
				'<a href="https://meet.google.com/abc-defg-hij">Join</a>'
			)
		).toBe("https://meet.google.com/abc-defg-hij");
	});

	it("builds native app links for Zoom and Teams but not Google Meet", () => {
		expect(getMeetingLaunchUrl("https://zoom.us/j/123456789?pwd=secret", "native")).toBe(
			"zoommtg://zoom.us/join?action=join&confno=123456789&pwd=secret"
		);
		expect(
			getMeetingLaunchUrl("https://teams.microsoft.com/l/meetup-join/abc?context=x", "native")
		).toBe("msteams:/l/meetup-join/abc?context=x");
		expect(getMeetingLaunchUrl("https://meet.google.com/abc-defg-hij", "native")).toBe(
			"https://meet.google.com/abc-defg-hij"
		);
	});

	it("keeps HTTPS links in browser mode", () => {
		const url = "https://zoom.us/j/123456789";
		expect(getMeetingLaunchUrl(url, "browser")).toBe(url);
	});
});
