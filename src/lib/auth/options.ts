import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

type BackendUser = {
  id: string;
  _id?: string;
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
  createdAt?: string;
  updatedAt?: string;
  telegramUserId?: string;
  telegramChatId?: string;
  telegramUsername?: string;
};

type BackendTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
};

type BackendLoginResponse = {
  success: boolean;
  message?: string;
  code?: string;
  data?: {
    user: BackendUser;
    tokens: BackendTokens;
  };
};

const backendBaseUrl =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:4000/api/v1';

const parseDurationToMs = (
  value: string | undefined,
  fallbackMs: number,
): number => {
  if (!value) return fallbackMs;

  const normalized = String(value).trim();

  if (/^\d+$/.test(normalized)) {
    return Number(normalized) * 1000;
  }

  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const normalizeUser = (user: BackendUser): BackendUser => {
  const id = user.id || user._id || '';

  return {
    ...user,
    id,
  };
};

const refreshAccessToken = async (token: any) => {
  try {
    if (!token.refreshToken) {
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        error: 'RefreshAccessTokenError',
      };
    }

    const response = await fetch(`${backendBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    const responseData = (await response.json().catch(() => null)) as
      | BackendLoginResponse
      | null;

    if (!response.ok || !responseData?.success || !responseData.data?.tokens) {
      return {
        ...token,
        accessToken: undefined,
        refreshToken: undefined,
        error: 'RefreshAccessTokenError',
      };
    }

    const { user, tokens } = responseData.data;

    return {
      ...token,
      user: user ? normalizeUser(user) : token.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || token.refreshToken,
      tokenType: tokens.tokenType,
      accessTokenExpiresAt:
        Date.now() +
        parseDurationToMs(tokens.accessTokenExpiresIn, 15 * 60 * 1000),
      refreshTokenExpiresAt:
        Date.now() +
        parseDurationToMs(tokens.refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000),
      error: undefined,
    };
  } catch {
    return {
      ...token,
      accessToken: undefined,
      refreshToken: undefined,
      error: 'RefreshAccessTokenError',
    };
  }
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',

      credentials: {
        username: {
          label: 'Username',
          type: 'text',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },

      async authorize(credentials) {
        const username = String(credentials?.username || '').trim();
        const password = String(credentials?.password || '');

        if (!username || !password) {
          throw new Error('نام کاربری و رمز عبور الزامی است.');
        }

        const response = await fetch(`${backendBaseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            email: username,
            password,
          }),
        });

        const responseData = (await response.json().catch(() => null)) as
          | BackendLoginResponse
          | null;

        if (!response.ok || !responseData?.success || !responseData.data) {
          throw new Error(
            responseData?.message || 'نام کاربری یا رمز عبور اشتباه است.',
          );
        }

        const { user, tokens } = responseData.data;

        const normalizedUser = normalizeUser(user);

        return {
          ...normalizedUser,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType,
          accessTokenExpiresAt:
            Date.now() +
            parseDurationToMs(tokens.accessTokenExpiresIn, 15 * 60 * 1000),
          refreshTokenExpiresAt:
            Date.now() +
            parseDurationToMs(
              tokens.refreshTokenExpiresIn,
              7 * 24 * 60 * 60 * 1000,
            ),
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as any;

        return {
          ...token,
          user: {
            id: authUser.id,
            firstName: authUser.firstName,
            lastName: authUser.lastName,
            fullName: authUser.fullName,
            username: authUser.username,
            email: authUser.email,
            phone: authUser.phone,
            role: authUser.role,
            roleLabel: authUser.roleLabel,
            status: authUser.status,
            statusLabel: authUser.statusLabel,
            isActive: authUser.isActive,
            profile: authUser.profile,
            managerId: authUser.managerId,
            language: authUser.language,
            direction: authUser.direction,
            lastLoginAt: authUser.lastLoginAt,
            telegramUserId: authUser.telegramUserId,
            telegramChatId: authUser.telegramChatId,
            telegramUsername: authUser.telegramUsername,
          },
          accessToken: authUser.accessToken,
          refreshToken: authUser.refreshToken,
          tokenType: authUser.tokenType,
          accessTokenExpiresAt: authUser.accessTokenExpiresAt,
          refreshTokenExpiresAt: authUser.refreshTokenExpiresAt,
          error: undefined,
        };
      }

      const accessTokenExpiresAt = Number(token.accessTokenExpiresAt || 0);
      const refreshTokenExpiresAt = Number(token.refreshTokenExpiresAt || 0);

      if (!token.accessToken || !token.refreshToken) {
        return {
          ...token,
          accessToken: undefined,
          refreshToken: undefined,
          error: 'RefreshAccessTokenError',
        };
      }

      if (refreshTokenExpiresAt && Date.now() >= refreshTokenExpiresAt) {
        return {
          ...token,
          accessToken: undefined,
          refreshToken: undefined,
          error: 'RefreshAccessTokenError',
        };
      }

      const refreshWindowMs = 30 * 1000;

      if (accessTokenExpiresAt && Date.now() < accessTokenExpiresAt - refreshWindowMs) {
        return token;
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      const tokenUser = token.user as any;

      session.user = {
        ...session.user,
        ...tokenUser,
      };

      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      (session as any).tokenType = token.tokenType;
      (session as any).accessTokenExpiresAt = token.accessTokenExpiresAt;
      (session as any).refreshTokenExpiresAt = token.refreshTokenExpiresAt;
      (session as any).error = token.error;

      return session;
    },
  },
};