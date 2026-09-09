jest.mock("obsidian", () => ({ Notice: jest.fn(), Platform: { isDesktopApp: true } }));

import { MeetingAutoJoinService } from "../../../src/services/MeetingAutoJoinService";
import type { ICSEvent } from "../../../src/types";

describe("MeetingAutoJoinService", () => {
	const start = Date.parse("2026-09-10T10:00:00Z");
	const event: ICSEvent = {
		id: "google-calendar-event",
		subscriptionId: "google-primary",
		title: "Planning",
		start: new Date(start).toISOString(),
		end: new Date(start + 30 * 60_000).toISOString(),
		allDay: false,
		meetingUrl: "https://zoom.us/j/123456789?pwd=secret",
	};

	function createService(options: {
		now?: number;
		events?: ICSEvent[];
		mode?: "native" | "browser";
		enabled?: boolean;
	}) {
		let now = options.now ?? start - 10 * 60_000;
		const launch = jest.fn().mockResolvedValue(undefined);
		const plugin = {
			settings: {
				autoJoinMeetingsEnabled: options.enabled ?? true,
				autoJoinMeetingsMinutesBefore: 5,
				autoJoinMeetingsLaunchMode: options.mode ?? "native",
			},
		};
		const service = new MeetingAutoJoinService(plugin as any, {
			now: () => now,
			getEvents: () => options.events ?? [event],
			openExternal: launch,
		});
		return { service, launch, setNow: (value: number) => (now = value) };
	}

	it("opens a meeting once at the configured early time", async () => {
		const { service, launch, setNow } = createService({});
		await service.checkNow();
		expect(launch).not.toHaveBeenCalled();

		setNow(start - 5 * 60_000);
		await service.checkNow();
		await service.checkNow();
		expect(launch).toHaveBeenCalledTimes(1);
		expect(launch).toHaveBeenCalledWith(
			"zoommtg://zoom.us/join?action=join&confno=123456789&pwd=secret"
		);
	});

	it("uses the original meeting URL in browser mode", async () => {
		const { service, launch } = createService({ now: start, mode: "browser" });
		await service.checkNow();
		expect(launch).toHaveBeenCalledWith(event.meetingUrl);
	});

	it("falls back to HTTPS when a native app link fails", async () => {
		const { service, launch } = createService({ now: start });
		launch.mockRejectedValueOnce(new Error("No protocol handler")).mockResolvedValueOnce(undefined);
		await service.checkNow();
		expect(launch.mock.calls.map(([url]) => url)).toEqual([
			"zoommtg://zoom.us/join?action=join&confno=123456789&pwd=secret",
			event.meetingUrl,
		]);
	});

	it("ignores disabled, all-day, and link-free events", async () => {
		const { service, launch } = createService({
			now: start,
			enabled: false,
			events: [
				{ ...event, allDay: true },
				{ ...event, id: "no-link", meetingUrl: undefined },
			],
		});
		await service.checkNow();
		expect(launch).not.toHaveBeenCalled();
	});

	it("does not launch meetings that were already eligible at startup", async () => {
		const { service, launch } = createService({ now: start });
		service.start();
		await service.checkNow();
		expect(launch).not.toHaveBeenCalled();
		service.destroy();
	});
});
