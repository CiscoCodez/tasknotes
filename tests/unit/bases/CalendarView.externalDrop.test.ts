import {
	getScheduledValueForExternalDrop,
	scheduleTaskFromExternalDrop,
} from "../../../src/bases/CalendarView";
import type { TaskCalendarDragPayload } from "../../../src/utils/DragDropManager";

describe("CalendarView external task drops", () => {
	const payload: TaskCalendarDragPayload = {
		type: "tasknotes-task",
		taskPath: "tasks/plan.md",
		title: "Plan",
		durationMinutes: 45,
	};

	it("converts all-day and timed drops using the local calendar value", () => {
		const date = new Date(2026, 8, 7, 14, 35);
		expect(getScheduledValueForExternalDrop(date, true)).toBe("2026-09-07");
		expect(getScheduledValueForExternalDrop(date, false)).toBe("2026-09-07T14:35");
	});

	it("updates only the scheduled property", async () => {
		const task = { path: payload.taskPath, title: payload.title, status: "open" };
		const updated = { ...task, scheduled: "2026-09-07T14:35" };
		const updateProperty = jest.fn().mockResolvedValue(updated);
		const plugin = {
			cacheManager: { getTaskInfo: jest.fn().mockResolvedValue(task) },
			taskService: { updateProperty },
		};

		await expect(
			scheduleTaskFromExternalDrop(plugin as any, payload, new Date(2026, 8, 7, 14, 35), false)
		).resolves.toBe(updated);
		expect(updateProperty).toHaveBeenCalledWith(task, "scheduled", "2026-09-07T14:35");
	});

	it.each([
		["missing", null],
		["archived", { path: payload.taskPath, archived: true }],
		["recurring", { path: payload.taskPath, recurrence: "FREQ=DAILY" }],
		["materialized", { path: payload.taskPath, recurrence_parent: "tasks/parent.md" }],
	])("rejects %s tasks without writing", async (_name, task) => {
		const updateProperty = jest.fn();
		const plugin = {
			cacheManager: { getTaskInfo: jest.fn().mockResolvedValue(task) },
			taskService: { updateProperty },
		};

		await expect(
			scheduleTaskFromExternalDrop(plugin as any, payload, new Date(2026, 8, 7), true)
		).rejects.toThrow();
		expect(updateProperty).not.toHaveBeenCalled();
	});
});
