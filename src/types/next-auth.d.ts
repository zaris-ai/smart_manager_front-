import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    tokenType?: 'Bearer';
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    error?: 'RefreshAccessTokenError';
    user: {
      id: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      username?: string;
      email?: string;
      phone?: string;
      role?: string;
      roleLabel?: string;
      status?: string;
      statusLabel?: string;
      isActive?: boolean;
      profile?: Record<string, any>;
      managerId?: string | null;
      language?: string;
      direction?: string;
      lastLoginAt?: string | null;
      telegramUserId?: string;
      telegramChatId?: string;
      telegramUsername?: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    username?: string;
    email?: string;
    phone?: string;
    role?: string;
    roleLabel?: string;
    status?: string;
    statusLabel?: string;
    isActive?: boolean;
    profile?: Record<string, any>;
    managerId?: string | null;
    language?: string;
    direction?: string;
    lastLoginAt?: string | null;
    telegramUserId?: string;
    telegramChatId?: string;
    telegramUsername?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: 'Bearer';
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      username?: string;
      email?: string;
      phone?: string;
      role?: string;
      roleLabel?: string;
      status?: string;
      statusLabel?: string;
      isActive?: boolean;
      profile?: Record<string, any>;
      managerId?: string | null;
      language?: string;
      direction?: string;
      lastLoginAt?: string | null;
      telegramUserId?: string;
      telegramChatId?: string;
      telegramUsername?: string;
    };
    accessToken?: string;
    refreshToken?: string;
    tokenType?: 'Bearer';
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    error?: 'RefreshAccessTokenError';
  }
}