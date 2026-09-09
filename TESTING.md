# Testing Status

## Pending - Solo

- [ ] **Automatically open upcoming meetings**
  - Testers: 1
  - Setup: Desktop Obsidian with Google, Microsoft, and ICS calendars containing upcoming Google Meet, Zoom, and Teams events; install the Zoom and Teams desktop apps.
  - Steps: Enable automatic meeting joining, choose native app mode and a non-zero early offset, then observe one event from each provider through its join time.
  - Expected: Each meeting opens once at the configured early time; Zoom and Teams open in their desktop apps, Google Meet opens in the browser, and all-day or link-free events do not open.

- [ ] **Control automatic meeting launch behavior**
  - Testers: 1
  - Setup: Desktop Obsidian with an upcoming meeting event and automatic meeting joining initially disabled.
  - Steps: Restart Obsidian after the event enters its join window, confirm no launch, enable the feature and select browser mode for a later event, then disable it again before another event.
  - Expected: Startup does not retroactively open a meeting already in its join window; browser mode opens the HTTPS meeting page once; disabling the setting prevents subsequent launches.

- [ ] **Fall back when a meeting app is unavailable**
  - Testers: 1
  - Setup: Desktop Obsidian with an upcoming Zoom or Teams event whose desktop app or protocol handler is unavailable.
  - Steps: Enable automatic meeting joining in native app mode and wait for the join time.
  - Expected: TaskNotes attempts the native app link and falls back to the original HTTPS meeting page without repeated launches.

- [ ] **Schedule Task List cards on the calendar**
  - Testers: 1
  - Setup: Desktop Obsidian with TaskNotes Task List and Calendar Bases views open side by side; include unscheduled, scheduled, recurring, and archived tasks.
  - Steps: Drag an unscheduled task's calendar icon to a timed slot, drag it again to an all-day or month cell, and try normal card clicks and manual reordering.
  - Expected: The mapped `scheduled` value first contains the exact local date/time and then only the selected date; the task appears once, unrelated metadata is unchanged, recurring/archived tasks have no calendar handle, and clicks/reordering still work.

- [ ] **Schedule Kanban cards on the calendar**
  - Testers: 1
  - Setup: Desktop Obsidian with TaskNotes Kanban and Calendar Bases views open side by side, including enough cards to activate virtual scrolling.
  - Steps: Drag a calendar icon from a normal and a virtualized Kanban card to the calendar, then move cards within and between Kanban columns and repeatedly scroll cards in and out of view.
  - Expected: Calendar handles appear on every initially visible card before scrolling; each drop reschedules only that task, Kanban column/manual-order dragging remains functional, and recycled cards retain one working calendar handle without duplicate drag behavior.

- [ ] **Schedule tasks in an Obsidian pop-out window**
  - Testers: 1
  - Setup: Desktop Obsidian with Task List or Kanban and Calendar panes in the same pop-out window.
  - Steps: Drag a task's calendar icon to an all-day cell and a timed slot, then close and reopen the panes.
  - Expected: Both drops persist the correct local values and reopening the views does not create duplicate handles or stale drag behavior.
