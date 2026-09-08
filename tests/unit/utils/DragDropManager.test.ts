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
	let animationFrameCallbacks: FrameRequestCallback[];

	beforeEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
		draggable.mockClear();
		destroy.mockClear();
		animationFrameCallbacks = [];
		jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			animationFrameCallbacks.push(callback);
			return animationFrameCallbacks.length;
		});
	});

	afterEach(() => jest.restoreAllMocks());

	const flushMutationObserver = async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
		for (const callback of animationFrameCallbacks.splice(0)) callback(0);
	};

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
		await flushMutationObserver();
		expect(destroy).toHaveBeenCalledTimes(1);

		manager.destroy();
		expect(destroy).toHaveBeenCalledTimes(2);
		expect(second.querySelector(".task-card__calendar-drag-handle")).toBeNull();
	});

	it("keeps handles registered while a Kanban column is mounted after an async render yield", async () => {
		const manager = new DragDropManager();
		const mountedCard = document.createElement("div");
		document.body.appendChild(mountedCard);
		manager.makeTaskCardDraggable(mountedCard, { path: "tasks/mounted.md", title: "Mounted" });

		const detachedColumn = document.createElement("div");
		const initialCard = document.createElement("div");
		detachedColumn.appendChild(initialCard);
		manager.makeTaskCardDraggable(initialCard, { path: "tasks/initial.md", title: "Initial" });
		document.body.appendChild(document.createElement("div"));
		await new Promise((resolve) => setTimeout(resolve, 0));

		document.body.appendChild(detachedColumn);
		for (const callback of animationFrameCallbacks.splice(0)) callback(0);

		expect(initialCard.querySelector(".task-card__calendar-drag-handle")).not.toBeNull();
		expect(destroy).not.toHaveBeenCalled();
		manager.destroy();
	});

	it("rejects malformed payloads", () => {
		expect(parseTaskCalendarDragPayload(undefined)).toBeNull();
		expect(parseTaskCalendarDragPayload("not-json")).toBeNull();
		expect(parseTaskCalendarDragPayload('{"type":"tasknotes-task"}')).toBeNull();
	});
});
