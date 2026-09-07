import { Draggable } from "@fullcalendar/interaction";
import { setIcon } from "obsidian";

export const TASK_CALENDAR_DRAG_TYPE = "tasknotes-task";
export const DEFAULT_TASK_CALENDAR_DRAG_DURATION_MINUTES = 60;

export interface TaskCalendarDragPayload {
	type: typeof TASK_CALENDAR_DRAG_TYPE;
	taskPath: string;
	title: string;
	durationMinutes: number;
}

type DraggableRegistration = {
	draggable: Draggable;
	handle: HTMLButtonElement;
	cleanup: () => void;
};

export function parseTaskCalendarDragPayload(value: string | undefined): TaskCalendarDragPayload | null {
	if (!value) return null;

	try {
		const payload = JSON.parse(value) as Partial<TaskCalendarDragPayload>;
		return payload.type === TASK_CALENDAR_DRAG_TYPE &&
			typeof payload.taskPath === "string" &&
			payload.taskPath.length > 0 &&
			typeof payload.title === "string" &&
			typeof payload.durationMinutes === "number" &&
			payload.durationMinutes > 0
			? (payload as TaskCalendarDragPayload)
			: null;
	} catch {
		return null;
	}
}

/** Owns FullCalendar external draggables attached to rendered task cards. */
export class DragDropManager {
	private draggableInstances = new Map<HTMLElement, DraggableRegistration>();
	private documentObservers = new Map<Document, MutationObserver>();

	makeTaskCardDraggable(
		element: HTMLElement,
		task: { path: string; title: string; timeEstimate?: number }
	): void {
		if (this.draggableInstances.has(element) || element.ownerDocument.body.classList.contains("is-mobile")) {
			return;
		}

		const payload: TaskCalendarDragPayload = {
			type: TASK_CALENDAR_DRAG_TYPE,
			taskPath: task.path,
			title: task.title,
			durationMinutes:
				task.timeEstimate && task.timeEstimate > 0
					? task.timeEstimate
					: DEFAULT_TASK_CALENDAR_DRAG_DURATION_MINUTES,
		};
		const handle = element.ownerDocument.createElement("button");
		handle.type = "button";
		handle.className = "task-card__calendar-drag-handle";
		handle.dataset.taskCalendarDrag = JSON.stringify(payload);
		handle.setAttribute("aria-label", "Drag to calendar");
		handle.setAttribute("title", "Drag to calendar");
		setIcon(handle, "calendar-plus");
		(element.querySelector(".task-card__main-row") ?? element).prepend(handle);

		const visualElement = element.matches(".task-card")
			? element
			: (element.querySelector<HTMLElement>(".task-card") ?? element);
		let previousDraggable: string | null = null;
		let dragActive = false;
		const endDrag = () => {
			if (!dragActive) return;
			dragActive = false;
			if (previousDraggable === null) {
				element.removeAttribute("draggable");
			} else {
				element.setAttribute("draggable", previousDraggable);
			}
			visualElement.classList.remove("task-card--calendar-dragging");
		};
		const stopCardInteraction = (event: Event) => event.stopPropagation();
		const startDrag = (event: Event) => {
			const OwnerNode = element.ownerDocument.defaultView?.Node;
			if (!OwnerNode || dragActive || !(event.target instanceof OwnerNode) || !handle.contains(event.target)) {
				return;
			}
			dragActive = true;
			previousDraggable = element.getAttribute("draggable");
			element.setAttribute("draggable", "false");
			visualElement.classList.add("task-card--calendar-dragging");
		};
		const preventClick = (event: Event) => {
			event.preventDefault();
			event.stopPropagation();
		};
		element.addEventListener("pointerdown", startDrag, { capture: true });
		element.addEventListener("mousedown", startDrag, { capture: true });
		handle.addEventListener("mousedown", stopCardInteraction);
		handle.addEventListener("click", preventClick);
		element.ownerDocument.addEventListener("pointerup", endDrag);
		element.ownerDocument.addEventListener("pointercancel", endDrag);
		element.ownerDocument.addEventListener("mouseup", endDrag);

		const draggable = new Draggable(handle, {
			eventData: {
				title: task.title,
				duration: { minutes: payload.durationMinutes },
				create: false,
			},
		});
		this.draggableInstances.set(element, {
			draggable,
			handle,
			cleanup: () => {
				element.removeEventListener("pointerdown", startDrag, { capture: true });
				element.removeEventListener("mousedown", startDrag, { capture: true });
				handle.removeEventListener("mousedown", stopCardInteraction);
				handle.removeEventListener("click", preventClick);
				element.ownerDocument.removeEventListener("pointerup", endDrag);
				element.ownerDocument.removeEventListener("pointercancel", endDrag);
				element.ownerDocument.removeEventListener("mouseup", endDrag);
				endDrag();
				handle.remove();
			},
		});
		this.observeDocument(element.ownerDocument);
	}

	removeDraggable(element: HTMLElement): void {
		const registration = this.draggableInstances.get(element);
		if (!registration) return;

		registration.draggable.destroy();
		registration.cleanup();
		this.draggableInstances.delete(element);
	}

	private observeDocument(document: Document): void {
		if (this.documentObservers.has(document)) return;

		const Observer = document.defaultView?.MutationObserver ?? MutationObserver;
		const observer = new Observer(() => {
			for (const element of this.draggableInstances.keys()) {
				if (element.ownerDocument === document && !element.isConnected) {
					this.removeDraggable(element);
				}
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		this.documentObservers.set(document, observer);
	}

	destroy(): void {
		for (const element of [...this.draggableInstances.keys()]) {
			this.removeDraggable(element);
		}
		for (const observer of this.documentObservers.values()) {
			observer.disconnect();
		}
		this.documentObservers.clear();
	}
}
