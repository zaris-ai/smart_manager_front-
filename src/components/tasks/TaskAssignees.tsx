import type { UserReference } from '@/types/project';
import { getReferenceId, getUserDisplayName } from '@/types/project';

type Props = {
  users?: UserReference[];
  compact?: boolean;
};

const roleMeta = (user: UserReference) => {
  if (typeof user === 'string') return { label: 'نقش نامشخص', className: 'badge-ghost' };
  const role = String(user.role || '').trim().toLowerCase().replace(/-/g, '_');

  if (role === 'trainee') return { label: 'کارآموز', className: 'badge-accent' };
  if (role === 'expert' || role === 'employee') {
    return { label: 'کارشناس', className: 'badge-info' };
  }
  if (role === 'board') return { label: 'هیئت مدیره', className: 'badge-secondary' };
  if (['manager', 'admin', 'super_admin', 'project_owner', 'specialty_owner'].includes(role)) {
    return { label: 'مدیر', className: 'badge-primary' };
  }
  return { label: user.roleLabel || 'نقش نامشخص', className: 'badge-ghost' };
};

export default function TaskAssignees({ users = [], compact = false }: Props) {
  if (!users.length) return <span className="text-base-content/50">بدون مجری مشخص</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {users.map((user, index) => {
        const meta = roleMeta(user);
        return (
          <span
            key={getReferenceId(user) || `${getUserDisplayName(user)}-${index}`}
            className={`inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-100 ${
              compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            }`}
          >
            <span className="font-bold">{getUserDisplayName(user)}</span>
            <span className={`badge badge-sm ${meta.className}`}>{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}
