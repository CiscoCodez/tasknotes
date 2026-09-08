# Testing Status

## Pending - Solo

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
