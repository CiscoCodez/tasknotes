import { Platform } from "obsidian";
import type TaskNotesPlugin from "../main";
import type { ICSEvent } from "../types";
import { extractMeetingUrl, getMeetingLaunchUrl } from "../utils/meetingLinks";
import { createTaskNotesLogger } from "../utils/tasknotesLogger";

const tasknotesLogger = createTaskNotesLogger({ tag: "Services/MeetingAutoJoinService" });
const CHECK_INTERVAL_MS = 15_000;
const LATE_JOIN_WINDOW_MS = 5 * 60_000;

type ElectronModuleLike = {
	shell?: { openExternal?: (url: string) => Promise<void> | void };
};

type MeetingAutoJoinOptions = {
	now?: () => number;
	getEvents?: () => ICSEvent[];
	openExternal?: (url: string) => Promise<void>;
};

async function openExternal(url: string): Promise<void> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-extraneous-dependencies -- Desktop meeting links must leave Obsidian and may use registered app protocols.
		const electron = require("electron") as ElectronModuleLike;
		if (electron.shell?.openExternal) {
			await electron.shell.openExternal(url);
			return;
		}
	} catch (error) {
		tasknotesLogger.warn("Failed to open meeting link through Electron; falling back to window.open.", {
			category: "provider",
			operation: "meeting-open-external",
			error,
		});
	}
	window.open(url, "_blank");
}

export class MeetingAutoJoinService {
	private timer: number | null = null;
	private processed = new Set<string>();
	private readonly now: () => number;
	private readonly getEvents: () => ICSEvent[];
	private readonly launch: (url: string) => Promise<void>;

	constructor(
		private readonly plugin: TaskNotesPlugin,
		options: MeetingAutoJoinOptions = {}
	) {
		this.now = options.now ?? Date.now;
		this.getEvents =
			options.getEvents ??
			(() => [
				...plugin.calendarProviderRegistry.getAllEvents(),
				...plugin.icsSubscriptionService.getAllEvents(),
			]);
		this.launch = options.openExternal ?? openExternal;
	}

	start(): void {
		if (this.timer !== null || !Platform.isDesktopApp) return;

		this.seedPastMeetings();
		this.timer = window.setInterval(() => void this.checkNow(), CHECK_INTERVAL_MS);
	}

	async checkNow(): Promise<void> {
		if (!this.plugin.settings.autoJoinMeetingsEnabled) return;

		const now = this.now();
		const offsetMs = Math.max(0, this.plugin.settings.autoJoinMeetingsMinutesBefore) * 60_000;
		for (const event of this.getEvents()) {
			const meetingUrl = event.meetingUrl ??
				extractMeetingUrl(event.location, event.description, event.url);
			const start = event.allDay ? Number.NaN : new Date(event.start).getTime();
			if (!meetingUrl || !Number.isFinite(start)) continue;

			const key = this.getEventKey(event, meetingUrl);
			if (
				this.processed.has(key) ||
				now < start - offsetMs ||
				now > start + LATE_JOIN_WINDOW_MS
			) {
				continue;
			}

			this.processed.add(key);
			const launchUrl = getMeetingLaunchUrl(
				meetingUrl,
				this.plugin.settings.autoJoinMeetingsLaunchMode
			);
			try {
				await this.launch(launchUrl);
			} catch (error) {
				let launchError = error;
				if (launchUrl !== meetingUrl) {
					try {
						await this.launch(meetingUrl);
						continue;
					} catch (fallbackError) {
						launchError = fallbackError;
					}
				}
				tasknotesLogger.error("Failed to open meeting link.", {
					category: "provider",
					operation: "meeting-auto-join",
					details: { eventId: event.id },
					error: launchError,
				});
			}
		}
	}

	private seedPastMeetings(): void {
		const now = this.now();
		const offsetMs = Math.max(0, this.plugin.settings.autoJoinMeetingsMinutesBefore) * 60_000;
		for (const event of this.getEvents()) {
			const meetingUrl = event.meetingUrl ??
				extractMeetingUrl(event.location, event.description, event.url);
			const start = event.allDay ? Number.NaN : new Date(event.start).getTime();
			if (meetingUrl && Number.isFinite(start) && start - offsetMs <= now) {
				this.processed.add(this.getEventKey(event, meetingUrl));
			}
		}
	}

	private getEventKey(event: ICSEvent, meetingUrl: string): string {
		return `${event.subscriptionId}|${event.recurringEventId ?? event.id}|${event.start}|${meetingUrl}`;
	}

	destroy(): void {
		if (this.timer !== null) window.clearInterval(this.timer);
		this.timer = null;
		this.processed.clear();
	}
}
