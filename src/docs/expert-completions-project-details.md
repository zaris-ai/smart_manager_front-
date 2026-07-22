# Expert completions in project details

Managers and admins now see two completion views inside `/dashboard/projects/[id]`:

1. The **Tasks** tab includes a separate read-only list of canonical project tasks whose status is `done`.
2. The manager-only **Expert completions** tab loads Telegram/panel completion submissions from `GET /api/v1/projects/:id/expert-completions`.

The expert-completion view shows the expert, completion date, duration, summary, deliverables, source, review status, reviewer, and manager note. These submission records are audit evidence and do not mutate `Project.status` or `ProjectTask.status`.
