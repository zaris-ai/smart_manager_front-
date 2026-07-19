import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CodeBracketSquareIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { Button, Input } from '@/components/ui';
import type { Project } from '@/types/project';
import type {
  CreateRepositoryConnectionPayload,
  RepositoryConnection,
  UpdateRepositoryConnectionPayload,
} from '@/types/repository-analysis';

export type RepositoryConnectionFormSubmitPayload =
  | CreateRepositoryConnectionPayload
  | UpdateRepositoryConnectionPayload;

interface RepositoryConnectionFormProps {
  projects?: Project[];
  repository?: RepositoryConnection | null;
  isSubmitting?: boolean;
  onSubmit: (payload: RepositoryConnectionFormSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
}

const projectIdOf = (project: Project): string => project.id || project._id || '';

const repositoryProjectIdOf = (
  project: RepositoryConnection['projectId'] | null | undefined,
): string => {
  if (!project) return '';
  if (typeof project === 'string') return project;
  return project.id || project._id || '';
};

export default function RepositoryConnectionForm({
  projects = [],
  repository,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: RepositoryConnectionFormProps) {
  const editing = Boolean(repository);
  const initialProjectId = repositoryProjectIdOf(repository?.projectId);

  const [projectId, setProjectId] = useState(initialProjectId);
  const [name, setName] = useState(repository?.name || '');
  const [repositoryUrl, setRepositoryUrl] = useState(repository?.repositoryUrl || '');
  const [defaultBranch, setDefaultBranch] = useState(repository?.defaultBranch || '');
  const [enabled, setEnabled] = useState(repository?.enabled !== false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.title.localeCompare(b.title, 'fa')),
    [projects],
  );

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!editing && !projectId) nextErrors.projectId = 'انتخاب پروژه الزامی است.';
    if (!repositoryUrl.trim()) nextErrors.repositoryUrl = 'آدرس مخزن GitLab الزامی است.';
    if (
      repositoryUrl.trim() &&
      !/^(https?:\/\/|git@|ssh:\/\/)/i.test(repositoryUrl.trim())
    ) {
      nextErrors.repositoryUrl = 'آدرس HTTPS یا SSH معتبر GitLab وارد کنید.';
    }
    if (name.trim() && name.trim().length < 2) {
      nextErrors.name = 'نام نمایشی باید حداقل ۲ کاراکتر باشد.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    if (editing) {
      await onSubmit({
        name: name.trim() || undefined,
        repositoryUrl: repositoryUrl.trim(),
        defaultBranch: defaultBranch.trim(),
        enabled,
      });
      return;
    }

    await onSubmit({
      projectId,
      name: name.trim() || undefined,
      repositoryUrl: repositoryUrl.trim(),
      defaultBranch: defaultBranch.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {!editing ? (
        <div className="form-control w-full text-right">
          <label className="mb-2 text-sm font-bold text-base-content/80">پروژه</label>
          <select
            className={`select select-bordered h-12 w-full rounded-2xl bg-base-100 ${
              errors.projectId ? 'select-error' : ''
            }`}
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setErrors((current) => ({ ...current, projectId: '' }));
            }}
          >
            <option value="">یک پروژه را انتخاب کنید</option>
            {sortedProjects.map((project) => (
              <option key={projectIdOf(project)} value={projectIdOf(project)}>
                {project.title}
              </option>
            ))}
          </select>
          {errors.projectId ? <p className="mt-2 text-xs font-bold text-error">{errors.projectId}</p> : null}
          {!projects.length ? (
            <p className="mt-2 text-xs leading-6 text-warning">
              پروژه‌ای برای اتصال یافت نشد. ابتدا یک پروژه در سامانه ثبت کنید.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Input
          label="نام نمایشی مخزن"
          placeholder="مثلاً Backend اصلی"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          leftIcon={<CodeBracketSquareIcon className="h-5 w-5" />}
          hint="در صورت خالی بودن، نام مخزن از آدرس GitLab استخراج می‌شود."
        />

        <Input
          label="شاخه پیش‌فرض"
          placeholder="main یا develop"
          value={defaultBranch}
          onChange={(event) => setDefaultBranch(event.target.value)}
          leftIcon={<ArrowPathIcon className="h-5 w-5" />}
          hint="برای تحلیل یک branch یا tag مشخص استفاده می‌شود."
          dir="ltr"
          className="text-left"
        />
      </div>

      <Input
        label="آدرس Clone مخزن GitLab"
        placeholder="https://gitlab.company.com/group/project.git"
        value={repositoryUrl}
        onChange={(event) => {
          setRepositoryUrl(event.target.value);
          setErrors((current) => ({ ...current, repositoryUrl: '' }));
        }}
        error={errors.repositoryUrl}
        leftIcon={<LinkIcon className="h-5 w-5" />}
        hint="توکن GitLab در بک‌اند نگهداری می‌شود؛ آن را داخل URL وارد نکنید."
        dir="ltr"
        className="text-left"
      />

      {editing ? (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/40 p-4">
          <div>
            <span className="font-black text-base-content">اتصال مخزن فعال باشد</span>
            <p className="mt-1 text-xs leading-6 text-base-content/55">
              در حالت غیرفعال، گزارش‌های قبلی باقی می‌مانند اما تحلیل جدید شروع نمی‌شود.
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary mt-1"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </label>
      ) : null}

      <div className="rounded-2xl border border-info/20 bg-info/10 p-4 text-sm leading-7 text-base-content/70">
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="mt-1 h-5 w-5 shrink-0 text-info" />
          <p>
            در نسخه فعلی فقط فایل‌ها، پکیج‌ها و ساختار معماری خوانده می‌شوند. هیچ کد، اسکریپت، build یا test اجرا نخواهد شد.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            انصراف
          </Button>
        ) : null}
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!editing && projects.length === 0}
          loadingText="در حال ذخیره..."
        >
          {editing ? 'ذخیره تنظیمات' : 'اتصال مخزن'}
        </Button>
      </div>
    </form>
  );
}