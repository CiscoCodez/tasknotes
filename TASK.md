# Task: Drag TaskNotes tasks onto the calendar

## Goal

Add an Akiflow-style workflow inside Obsidian: keep a TaskNotes task list or Kanban view in one pane, keep a TaskNotes calendar in another pane, and drag a task onto a calendar date/time to schedule it.

This should use TaskNotes tasks and the TaskNotes calendar directly. It must not require the separate Task Calendar plugin or an intermediate note.

## Confirmed current state

- `src/utils/DragDropManager.ts` already contains a FullCalendar `Draggable` wrapper and stores the task path on a dragged element.
- The manager is created during plugin bootstrap, but rendered task cards are not registered with `makeTaskCardDraggable()`.
- `src/bases/CalendarView.ts` supports moving/resizing events that are already on the calendar through `eventDrop` and `eventResize`.
- The calendar is not configured to accept an external task card and convert that drop into a TaskNotes schedule update.
- Task List and Kanban already implement their own drag behavior for manual ordering or moving between columns, so calendar dragging must coexist with those interactions.

## Implementation checklist

### 1. Define the drag payload and lifecycle

- [ ] Replace the implicit DOM-only contract with a small typed payload containing at least the task path.
- [ ] Make `DragDropManager` expose setup and cleanup methods that can safely be called when cards are rendered, recycled by virtual scrolling, replaced, or unmounted.
- [ ] Ensure each card has only one draggable instance and that all FullCalendar `Draggable` instances and DOM listeners are destroyed during cleanup/plugin unload.
- [ ] Use the owner document/window of the card so the feature also works in Obsidian pop-out windows.
- [ ] Add accessible labels/tooltips and a visible grab/drag state without making ordinary clicks open or mutate the task accidentally.

Likely files:

- `src/utils/DragDropManager.ts`
- `src/bootstrap/pluginBootstrap.ts`
- `src/main.ts`
- Task-card drag styles in the appropriate stylesheet source

### 2. Make task cards draggable to the calendar

- [ ] Register cards created by `TaskListView` with the shared drag manager.
- [ ] Register cards created by `KanbanView` with the shared drag manager.
- [ ] Decide whether reading-mode inline task cards should be supported in the first PR. If included, register them through their renderer and clean them up when the Markdown view rerenders.
- [ ] Keep manual Task List reordering and Kanban column movement working.
- [ ] Prefer a dedicated calendar-drag handle or a clearly defined drag gesture if sharing the whole card causes conflicts with the existing reorder drag.
- [ ] Verify cards rendered through virtual scrolling are registered when mounted and unregistered when recycled.

Likely files:

- `src/bases/TaskListView.ts`
- `src/bases/KanbanView.ts`
- `src/editor/ReadingModeTaskLinkProcessor.ts` if inline cards are included
- `src/ui/TaskCard.ts` if a reusable drag handle is added to the shared card UI

### 3. Accept external task drops in FullCalendar

- [ ] Enable FullCalendar external dropping (`droppable`) in `CalendarView`.
- [ ] Add an external-drop handler (`drop` or `eventReceive`, depending on the final payload design).
- [ ] Resolve the task by its path and reject malformed, missing, archived, or otherwise invalid task payloads with a useful notice.
- [ ] Convert the dropped slot to the vault's/local timezone correctly.
- [ ] In month/all-day views, set a scheduled date without inventing a time.
- [ ] In timed views, set the scheduled date and start time from the exact drop slot.
- [ ] Give the preview/drop a sensible duration: use the task's existing time estimate when available and otherwise use a documented configurable/default duration. Dropping must not silently change due date, status, priority, or completion.
- [ ] Refresh the calendar and source task card immediately after the write, with no duplicate temporary event.
- [ ] Revert the visual drop and show an error if persistence fails.

Likely file:

- `src/bases/CalendarView.ts`

### 4. Persist through TaskNotes APIs

- [ ] Update the task through TaskNotes' task/property service (for example, the existing `updateTaskProperty` path) instead of directly assuming frontmatter field names.
- [ ] Respect the user's field mapping for `scheduled` and related fields.
- [ ] Preserve all unrelated task properties.
- [ ] Decide and document how recurring tasks and materialized recurrence instances behave before enabling them as drag sources.
- [ ] Ensure a task already scheduled elsewhere is rescheduled, not copied into a second task.
- [ ] Confirm external Google/Microsoft calendar events remain separate; dragging a TaskNotes task schedules the task and does not create an external calendar event unless a separate sync feature explicitly does so.

### 5. Tests

- [ ] Unit-test `DragDropManager` registration, duplicate prevention, payload creation, and cleanup.
- [ ] Unit-test drop-to-scheduled-value conversion for all-day and timed calendar views, including timezone boundaries.
- [ ] Unit-test failed/invalid drops and confirm no task fields change.
- [ ] Add regression tests proving Task List manual ordering still works.
- [ ] Add regression tests proving Kanban column dragging still works.
- [ ] Add an end-to-end test with Task List and Calendar open side by side: drag an unscheduled task to a time slot, verify its `scheduled` value, and verify it appears once on the calendar.
- [ ] Test virtualized lists, pop-out windows, and the supported desktop platforms. Treat touch/mobile drag support as a separate scope unless it is implemented and tested here.

Likely test locations:

- `tests/unit/utils/DragDropManager.test.ts`
- `tests/unit/bases/CalendarView.externalDrop.test.ts`
- Existing Task List/Kanban drag-control test suites
- `e2e/`

### 6. Documentation and release preparation

- [ ] Document the side-by-side Task List/Kanban + Calendar workflow and the exact drag handle/gesture.
- [ ] Add a user-facing entry to `docs/releases/unreleased.md` when the feature is implemented.
- [ ] If a GitHub issue is opened first, link it from the PR and acknowledge the reporter as required by `AGENTS.md`.

## Acceptance criteria

- [ ] With a TaskNotes Task List on the left and TaskNotes Calendar on the right, an unscheduled task can be dragged to a calendar slot.
- [ ] The task receives the correct `scheduled` date/time and appears exactly once at that slot.
- [ ] Dragging to an all-day/month cell schedules only the date; dragging to a timed cell schedules the exact time.
- [ ] The task remains a task. Its status, due date, priority, title, recurrence data, and other metadata remain unchanged unless the scheduling operation explicitly requires a documented recurrence update.
- [ ] Existing calendar event move/resize, Task List reorder, and Kanban drag behavior still pass their tests.
- [ ] Closing/rerendering views leaves no stale draggable instances or duplicate listeners.
- [ ] The workflow works without Task Calendar, Google Calendar, or an intermediate Markdown note.

## Required verification before submitting a PR

Follow the repository guide and run:

```bash
npm test
npm run lint
npm run typecheck
npm run build:test
obsidian vault=test plugin:reload id=tasknotes
obsidian vault=test dev:errors
```

Then verify the side-by-side workflow manually in Obsidian and capture a screenshot or short recording for the PR description.

