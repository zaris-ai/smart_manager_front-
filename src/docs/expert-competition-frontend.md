# Expert competition page

Expert-only route: `/dashboard/expert-competition`

The page uses the shared leaderboard API but renders a dedicated expert experience. It shows the authenticated expert's rank, score, nearest competitors, podium, score components, next-rank missions, earned badges, and the public leaderboard. It intentionally does not expose managerial work-log drill-down links or private peer report details.

Access is enforced with `withAuth(..., { allowedRoles: ['expert'] })` and the sidebar item is visible only to expert/employee roles.

The interface is built entirely with Tailwind/DaisyUI, Heroicons, CSS gradients, and SVG progress rings. No generated or external image assets are required.
