const destroy = jest.fn();
const draggable = jest.fn().mockImplementation(() => ({ destroy }));

jest.mock("@fullcalendar/interaction", () => ({
	Draggable: draggable,
}));

import {
	DEFAULT_TASK_CALENDAR_DRAG_DURATION_MINUTES,
	DragDropManager,
	parseTaskCalendarDragPayload,
} from "../../../src/utils/DragDropManager";

describe("DragDropManager", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
		draggable.mockClear();
		destroy.mockClear();
	});

	it("registers one typed calendar drag handle per card", () => {
		const manager = new DragDropManager();
		const card = document.createElement("div");
		card.innerHTML = '<div class="task-card__main-row"></div>';
		document.body.appendChild(card);

		manager.makeTaskCardDraggable(card, { path: "tasks/plan.md", title: "Plan" });
		manager.makeTaskCardDraggable(card, { path: "tasks/plan.md", title: "Plan" });

		const handle = card.querySelector<HTMLButtonElement>(".task-card__calendar-drag-handle");
		expect(draggable).toHaveBeenCalledTimes(1);
		expect(handle?.getAttribute("aria-label")).toBe("Drag to calendar");
		expect(parseTaskCalendarDragPayload(handle?.dataset.taskCalendarDrag)).toEqual({
			type: "tasknotes-task",
			taskPath: "tasks/plan.md",
			title: "Plan",
			durationMinutes: DEFAULT_TASK_CALENDAR_DRAG_DURATION_MINUTES,
		});
		card.setAttribute("draggable", "true");
		handle?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		expect(card.getAttribute("draggable")).toBe("false");
		document.dispatchEvent(new MouseEvent("mouseup"));
		expect(card.getAttribute("draggable")).toBe("true");
		manager.destroy();
	});

	it("destroys registrations when cards are removed or the manager unloads", async () => {
		const manager = new DragDropManager();
		const first = document.createElement("div");
		const second = document.createElement("div");
		document.body.append(first, second);
		manager.makeTaskCardDraggable(first, { path: "tasks/first.md", title: "First" });
		manager.makeTaskCardDraggable(second, {
			path: "tasks/second.md",
			title: "Second",
			timeEstimate: 25,
		});

		first.remove();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(destroy).toHaveBeenCalledTimes(1);

		manager.destroy();
		expect(destroy).toHaveBeenCalledTimes(2);
		expect(second.querySelector(".task-card__calendar-drag-handle")).toBeNull();
	});

	it("rejects malformed payloads", () => {
		expect(parseTaskCalendarDragPayload(undefined)).toBeNull();
		expect(parseTaskCalendarDragPayload("not-json")).toBeNull();
		expect(parseTaskCalendarDragPayload('{"type":"tasknotes-task"}')).toBeNull();
	});
});
