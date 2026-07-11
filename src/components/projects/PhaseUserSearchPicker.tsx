import { useMemo, useState } from 'react';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { getUserDisplayName } from '@/types/project';
import type { AppUser } from '@/types/user';

const getUserId = (user: AppUser): string => user.id || user._id || '';

const normalizeSearch = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
};

type PhaseUserSearchPickerProps = {
  users: AppUser[];
  selectedUserIds: string[];
  onToggle: (userId: string) => void;
  loading?: boolean;
  title?: string;
  emptyText?: string;
};

const PhaseUserSearchPicker = ({
  users,
  selectedUserIds,
  onToggle,
  loading = false,
  title = 'مسئولان فاز',
  emptyText = 'کاربری برای انتخاب وجود ندارد.',
}: PhaseUserSearchPickerProps) => {
  const [search, setSearch] = useState('');

  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const selectedUsers = useMemo(() => {
    return users.filter((user) => selectedSet.has(getUserId(user)));
  }, [selectedSet, users]);

  const filteredUsers = useMemo(() => {
    const normalized = normalizeSearch(search);

    if (!normalized) return users;

    return users.filter((user) => {
      const haystack = normalizeSearch(
        [
          getUserDisplayName(user as any),
          user.username,
          user.email,
          user.roleLabel,
          String(user.role || ''),
        ]
          .filter(Boolean)
          .join(' '),
      );

      return haystack.includes(normalized);
    });
  }, [search, users]);

  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-3">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-base-content">
            <UserCircleIcon className="h-5 w-5 text-primary" />
            {title}
          </div>
          <p className="mt-1 text-xs leading-6 text-base-content/55">
            {selectedUserIds.length
              ? `${selectedUserIds.length.toLocaleString('fa-IR')} نفر برای این فاز انتخاب شده‌اند.`
              : 'برای این فاز حداقل یک مسئول انتخاب کنید.'}
          </p>
        </div>

        {selectedUsers.length ? (
          <div className="flex max-w-xl flex-wrap gap-1.5">
            {selectedUsers.slice(0, 4).map((user) => {
              const userId = getUserId(user);

              return (
                <button
                  key={userId}
                  type="button"
                  className="badge badge-primary badge-outline gap-1 py-3 text-[11px] font-black"
                  onClick={() => onToggle(userId)}
                  title="حذف از فاز"
                >
                  {getUserDisplayName(user as any)}
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              );
            })}
            {selectedUsers.length > 4 ? (
              <span className="badge badge-ghost py-3 text-[11px] font-black">
                +{(selectedUsers.length - 4).toLocaleString('fa-IR')}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <label className="input input-bordered mb-3 flex items-center gap-2 bg-base-200/60 focus-within:bg-base-100">
        <MagnifyingGlassIcon className="h-5 w-5 text-base-content/40" />
        <input
          className="grow bg-transparent text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجوی نام، نام کاربری، ایمیل یا نقش"
          type="search"
        />
        {search ? (
          <button
            className="btn btn-ghost btn-xs btn-circle"
            type="button"
            onClick={() => setSearch('')}
            aria-label="پاک کردن جستجو"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      {loading ? (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200/40">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : filteredUsers.length ? (
        <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => {
            const userId = getUserId(user);
            const checked = selectedSet.has(userId);

            return (
              <label
                key={userId}
                className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                  checked
                    ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                    : 'border-base-300 bg-base-200/40 text-base-content/75 hover:border-primary/40 hover:bg-primary/5'
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-black">
                    {getUserDisplayName(user as any)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold opacity-60">
                    {user.roleLabel || user.role || user.email || user.username || 'بدون نقش'}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm shrink-0"
                  checked={checked}
                  onChange={() => onToggle(userId)}
                />
              </label>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-base-300 bg-base-200/40 px-4 py-8 text-center text-sm font-bold text-base-content/55">
          {search ? 'کاربری با این جستجو پیدا نشد.' : emptyText}
        </div>
      )}
    </div>
  );
};

export default PhaseUserSearchPicker;
