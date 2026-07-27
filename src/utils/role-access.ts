export type PanelRole = 'board' | 'manager' | 'expert' | 'trainee' | 'unknown';

export const ADMIN_PANEL_ROLES: PanelRole[] = ['manager', 'board'];
export const EXPERT_PANEL_ROLES: PanelRole[] = ['expert', 'trainee'];

export const getPanelRole = (role?: string | null): PanelRole => {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (normalized === 'board') return 'board';
  if (
    ['manager', 'admin', 'super_admin', 'project_owner', 'specialty_owner'].includes(
      normalized,
    )
  ) {
    return 'manager';
  }
  if (['expert', 'employee'].includes(normalized)) return 'expert';
  if (normalized === 'trainee') return 'trainee';

  return 'unknown';
};

export const isAdminPanelRole = (role?: string | null): boolean => {
  return ADMIN_PANEL_ROLES.includes(getPanelRole(role));
};

export const isExpertPanelRole = (role?: string | null): boolean => {
  return EXPERT_PANEL_ROLES.includes(getPanelRole(role));
};

export const getRoleHomeRoute = (role?: string | null): string => {
  const panelRole = getPanelRole(role);

  if (panelRole === 'expert' || panelRole === 'trainee') return '/dashboard/expert-work-logs';
  if (panelRole === 'manager' || panelRole === 'board') return '/dashboard';

  return '/auth/error?error=AccessDenied';
};
