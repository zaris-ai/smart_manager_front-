import { UserCircleIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const DICEBEAR_AVATAR_STYLES = [
  'lorelei',
  'bottts',
  'avataaars',
  'pixel-art',
  'notionists',
  'adventurer',
  'fun-emoji',
  'micah',
  'open-peeps',
  'personas',
  'ringo',
] as const;

export type AvatarStyle = (typeof DICEBEAR_AVATAR_STYLES)[number];

interface UserAvatarProps {
  userId?: string | null;
  name?: string | null;
  size?: AvatarSize;
  /** Leave empty to select a random DiceBear style for this avatar instance. */
  style?: AvatarStyle;
  className?: string;
  imageClassName?: string;
  alt?: string;
  eager?: boolean;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-8 w-8',
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-20 w-20',
  '2xl': 'h-28 w-28',
};

const fallbackIconClasses: Record<AvatarSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
  xl: 'h-11 w-11',
  '2xl': 'h-16 w-16',
};

const createRandomSeed = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36)).join('-');
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const getRandomDiceBearStyle = (): AvatarStyle => {
  const index = Math.floor(Math.random() * DICEBEAR_AVATAR_STYLES.length);
  return DICEBEAR_AVATAR_STYLES[index];
};

export const getDiceBearAvatarUrl = ({
  style,
  seed = createRandomSeed(),
}: {
  style?: AvatarStyle;
  seed?: string;
} = {}): string => {
  const baseUrl = (process.env.NEXT_PUBLIC_DICEBEAR_BASE_URL || 'https://api.dicebear.com/10.x').replace(/\/$/, '');
  const randomStyle = style || getRandomDiceBearStyle();
  const params = new URLSearchParams({ seed });

  return `${baseUrl}/${randomStyle}/svg?${params.toString()}`;
};

export const UserAvatar = ({
  userId,
  name,
  size = 'md',
  style,
  className = '',
  imageClassName = '',
  alt,
  eager = false,
}: UserAvatarProps) => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Select a random style and random image once for this rendered user.
    // It remains stable during ordinary re-renders and changes after remount/reload.
    setFailed(false);
    setAvatarUrl(getDiceBearAvatarUrl({ style }));
  }, [style, userId]);

  const label = alt || (name ? `تصویر کاربر ${name}` : 'تصویر کاربر');

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-base-300 bg-base-200 shadow-sm ${sizeClasses[size]} ${className}`}
      title={name || undefined}
    >
      {!avatarUrl || failed ? (
        <UserCircleIcon
          className={`${fallbackIconClasses[size]} text-base-content/35`}
          aria-label={label}
        />
      ) : (
        <img
          src={avatarUrl}
          alt={label}
          width={112}
          height={112}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`h-full w-full object-cover ${imageClassName}`}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};

export default UserAvatar;
