import { ICSEventContextMenu } from "../../../src/components/ICSEventContextMenu";
import type { ICSEvent } from "../../../src/types";

describe("ICSEventContextMenu meeting action", () => {
	const event: ICSEvent = {
		id: "meeting",
		subscriptionId: "google-primary",
		title: "Planning",
		start: "2026-09-11T10:00:00Z",
		end: "2026-09-11T10:30:00Z",
		allDay: false,
		meetingUrl: "https://meet.google.com/abc-defg-hij",
	};

	function createMenu(icsEvent: ICSEvent) {
		const openMeeting = jest.fn().mockResolvedValue(undefined);
		const plugin = {
			i18n: {
				translate: (key: string) => key,
				getCurrentLocale: () => "en",
			},
			meetingAutoJoinService: { openMeeting },
		};
		const contextMenu = new ICSEventContextMenu({ icsEvent, plugin: plugin as any });
		return { menu: (contextMenu as any).menu, openMeeting };
	}

	it("shows Join meeting for recognized meeting links and launches it", async () => {
		const { menu, openMeeting } = createMenu(event);
		const item = menu.items.find((candidate: any) =>
			candidate.setTitle?.mock.calls.some(
				([title]: [string]) => title === "contextMenus.ics.joinMeeting"
			)
		);
		expect(item).toBeDefined();
		await item.onClick.mock.calls[0][0]();
		expect(openMeeting).toHaveBeenCalledWith(event.meetingUrl);
	});

	it("does not show Join meeting for ordinary calendar events", () => {
		const { menu } = createMenu({ ...event, meetingUrl: undefined });
		expect(
			menu.items.some((candidate: any) =>
				candidate.setTitle?.mock.calls.some(
					([title]: [string]) => title === "contextMenus.ics.joinMeeting"
				)
			)
		).toBe(false);
	});
});
