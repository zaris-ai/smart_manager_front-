import type { ElementType, ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
};

export const DashboardPageHeader = ({
  title,
  description,
  actions,
  backHref,
  backLabel = 'بازگشت',
  eyebrow,
}: DashboardPageHeaderProps) => {
  return (
    <header className="avid-glass-surface rounded-3xl p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-base-content/55 transition hover:text-primary"
            >
              <ArrowRightIcon className="h-4 w-4" />
              {backLabel}
            </Link>
          ) : null}

          {eyebrow ? (
            <div className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-2xl font-black text-base-content lg:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-base-content/60">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
};

type AdminStatCardProps = {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ElementType;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
};

const statToneClasses: Record<NonNullable<AdminStatCardProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  neutral: 'bg-base-200 text-base-content/70',
};

export const AdminStatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
}: AdminStatCardProps) => {
  return (
    <div className="avid-glass-surface rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-base-content/55">{title}</p>
          <div className="mt-3 text-3xl font-black text-base-content">{value}</div>
          {description ? (
            <div className="mt-2 text-xs leading-6 text-base-content/55">
              {description}
            </div>
          ) : null}
        </div>

        {Icon ? (
          <div className={cn('shrink-0 rounded-2xl p-3', statToneClasses[tone])}>
            <Icon className="h-6 w-6" />
          </div>
        ) : null}
      </div>
    </div>
  );
};

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export const SectionCard = ({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: SectionCardProps) => {
  return (
    <section className={cn('avid-glass-surface rounded-3xl p-5', className)}>
      {(title || description || actions) ? (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h2 className="text-lg font-black text-base-content">{title}</h2> : null}
            {description ? (
              <p className="mt-1 max-w-3xl text-sm leading-7 text-base-content/55">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
};

export const FilterBar = ({ children, className }: { children: ReactNode; className?: string }) => {
  return (
    <div className={cn('avid-glass-surface rounded-3xl p-4', className)}>
      {children}
    </div>
  );
};

export const SoftBadge = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black', className)}>
      {children}
    </span>
  );
};
