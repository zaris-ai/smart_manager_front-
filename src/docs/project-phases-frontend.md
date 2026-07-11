# Project phases frontend

## What this frontend supports

The projects frontend keeps project phasing and restores the simple financial section for each phase. The standalone project-finance/invoice system remains removed.

A project can be created and edited with phases. Each phase contains:

- title
- description
- assigned people
- start date
- end date
- expected revenue
- expected expense
- realized revenue
- realized expense
- short financial note

## Main pages

- `/dashboard/projects`
  - shows projects
  - links to project details
  - no old project-finance button

- `/dashboard/projects/define`
  - creates a project through a full page, not a modal
  - supports phase definition
  - supports expected revenue and expected expense per phase
  - uses Shamsi date inputs

- `/dashboard/projects/:id`
  - shows project details
  - shows project phases as full-width rows
  - shows simple financial values per phase
  - links to the phase financial page

- `/dashboard/projects/:id/edit`
  - edits project base data
  - edits project phases
  - preserves simple phase financial values
  - uses Shamsi date inputs

- `/dashboard/projects/:id/phases/:phaseId`
  - displays phase details
  - updates realized revenue, realized expense, and financial note

## Removed frontend finance items

- `src/components/project-finance`
- `src/services/project-finance.service.ts`
- `src/types/project-finance.ts`
- `/dashboard/projects/:id/finance`

## Backend API used by this frontend

```txt
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

GET    /projects/:id/phases
POST   /projects/:id/phases
GET    /projects/:id/phases/:phaseId
PATCH  /projects/:id/phases/:phaseId
PATCH  /projects/:id/phases/:phaseId/financial
DELETE /projects/:id/phases/:phaseId
```
