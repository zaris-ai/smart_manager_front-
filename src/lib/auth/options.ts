import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const backendBaseUrl =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:4000/api/v1';

type BackendAuthUser = {
  id: string;
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  role?: string;
  roleLabel?: string;
  accessLevel?: number;
  permissions?: string[];
};

type BackendTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  accessTokenExpiresIn?: string;
  refreshTokenExpiresIn?: string;
};

type BackendAuthResponse = {
  success: boolean;
  message?: string;
  data?: {
    user?: BackendAuthUser;
    tokens?: BackendTokens;
  };
};

const parseDurationToMs = (duration?: string): number => {
  if (!duration) return 15 * 60 * 1000;

  const normalized = duration.trim();

  if (/^\d+$/.test(normalized)) {
    return Number(normalized) * 1000;
  }

  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) return 15 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
};

const getJwtExpiresAt = (
  token?: string,
  fallbackExpiresIn?: string,
): number => {
  if (!token) {
    return Date.now() + parseDurationToMs(fallbackExpiresIn);
  }

  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return Date.now() + parseDurationToMs(fallbackExpiresIn);
    }

    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as {
      exp?: number;
    };

    if (decodedPayload.exp) {
      return decodedPayload.exp * 1000;
    }

    return Date.now() + parseDurationToMs(fallbackExpiresIn);
  } catch {
    return Date.now() + parseDurationToMs(fallbackExpiresIn);
  }
};

const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('پاسخ سرور احراز هویت JSON معتبر نیست.');
  }
};

const refreshAccessToken = async (token: any) => {
  try {
    if (!token.refreshToken) {
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      };
    }

    const response = await fetch(`${backendBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    const responseData = await readJsonResponse<BackendAuthResponse>(response);

    if (!response.ok || !responseData.success) {
      throw new Error(responseData.message || 'خطا در تمدید نشست کاربر.');
    }

    const refreshedTokens = responseData.data?.tokens;
    const refreshedUser = responseData.data?.user;

    if (!refreshedTokens?.accessToken || !refreshedTokens?.refreshToken) {
      throw new Error('توکن جدید از سرور دریافت نشد.');
    }

    return {
      ...token,

      id: refreshedUser?.id || token.id,
      username: refreshedUser?.username || token.username,
      name:
        refreshedUser?.fullName ||
        [refreshedUser?.firstName, refreshedUser?.lastName]
          .filter(Boolean)
          .join(' ') ||
        token.name,
      email: refreshedUser?.email ?? token.email,
      role: refreshedUser?.role || token.role,
      roleLabel: refreshedUser?.roleLabel || token.roleLabel,
      accessLevel: refreshedUser?.accessLevel ?? token.accessLevel,
      permissions: refreshedUser?.permissions || token.permissions || [],

      accessToken: refreshedTokens.accessToken,

      /**
       * Backend rotates refresh tokens.
       * Always save the new refresh token.
       */
      refreshToken: refreshedTokens.refreshToken,

      accessTokenExpiresIn:
        refreshedTokens.accessTokenExpiresIn || token.accessTokenExpiresIn,
      refreshTokenExpiresIn:
        refreshedTokens.refreshTokenExpiresIn || token.refreshTokenExpiresIn,

      accessTokenExpiresAt: getJwtExpiresAt(
        refreshedTokens.accessToken,
        refreshedTokens.accessTokenExpiresIn,
      ),

      error: undefined,
    };
  } catch (error) {
    console.error('[NextAuth] refreshAccessToken failed:', error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',

    /**
     * NextAuth session should live at least as long as backend refresh token.
     * Backend access token is short-lived, refresh token is the real session.
     */
    maxAge: 7 * 24 * 60 * 60,
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',

      credentials: {
        username: {
          label: 'نام کاربری',
          type: 'text',
        },
        password: {
          label: 'رمز عبور',
          type: 'password',
        },
      },

      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('نام کاربری و رمز عبور الزامی است.');
        }

        const response = await fetch(`${backendBaseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            username: String(credentials.username),
            password: String(credentials.password),
          }),
        });

        const responseData = await readJsonResponse<BackendAuthResponse>(
          response,
        );

        if (!response.ok || !responseData.success) {
          throw new Error(
            responseData.message || 'نام کاربری یا رمز عبور اشتباه است.',
          );
        }

        const backendUser = responseData.data?.user;
        const tokens = responseData.data?.tokens;

        if (!backendUser?.id) {
          throw new Error('شناسه کاربر از سرویس احراز هویت دریافت نشد.');
        }

        if (!tokens?.accessToken || !tokens?.refreshToken) {
          throw new Error('توکن‌های احراز هویت از سرور دریافت نشدند.');
        }

        return {
          id: backendUser.id,
          username: backendUser.username || String(credentials.username),
          name:
            backendUser.fullName ||
            [backendUser.firstName, backendUser.lastName]
              .filter(Boolean)
              .join(' ') ||
            backendUser.username ||
            String(credentials.username),
          email: backendUser.email || null,
          role: backendUser.role,
          roleLabel: backendUser.roleLabel,
          accessLevel: backendUser.accessLevel,
          permissions: backendUser.permissions || [],

          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresIn: tokens.accessTokenExpiresIn || '15m',
          refreshTokenExpiresIn: tokens.refreshTokenExpiresIn || '7d',
          accessTokenExpiresAt: getJwtExpiresAt(
            tokens.accessToken,
            tokens.accessTokenExpiresIn,
          ),
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      /**
       * First login.
       */
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.roleLabel = user.roleLabel;
        token.accessLevel = user.accessLevel;
        token.permissions = user.permissions || [];

        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpiresIn = user.accessTokenExpiresIn;
        token.refreshTokenExpiresIn = user.refreshTokenExpiresIn;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
        token.error = undefined;

        return token;
      }

      const accessTokenExpiresAt =
        typeof token.accessTokenExpiresAt === 'number'
          ? token.accessTokenExpiresAt
          : 0;

      /**
       * Refresh 30 seconds before backend access token expires.
       */
      const shouldRefresh = Date.now() >= accessTokenExpiresAt - 30_000;

      if (!shouldRefresh) {
        return token;
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.roleLabel = token.roleLabel as string;
        session.user.accessLevel = token.accessLevel as number;
        session.user.permissions = token.permissions as string[];
      }

      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.accessTokenExpiresIn = token.accessTokenExpiresIn as string;
      session.refreshTokenExpiresIn = token.refreshTokenExpiresIn as string;
      session.accessTokenExpiresAt = token.accessTokenExpiresAt as number;
      session.error = token.error as string | undefined;

      return session;
    },
  },
};