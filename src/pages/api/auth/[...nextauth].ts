import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:4000/api/v1';

const parseExpiresInToMs = (
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

const normalizeUser = (user: any) => {
  return {
    ...user,
    id: user?.id || user?._id || null,
  };
};

const removeUndefined = (value: any): any => {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }

  if (typeof value === 'object') {
    const result: Record<string, any> = {};

    Object.entries(value).forEach(([key, item]) => {
      result[key] = removeUndefined(item);
    });

    return result;
  }

  return value;
};

const refreshAccessToken = async (token: any) => {
  try {
    if (!token.refreshToken) {
      return {
        ...token,
        accessToken: null,
        refreshToken: null,
        error: 'RefreshAccessTokenError',
      };
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success || !data?.data?.tokens) {
      return {
        ...token,
        accessToken: null,
        refreshToken: null,
        error: 'RefreshAccessTokenError',
      };
    }

    const tokens = data.data.tokens;

    return removeUndefined({
      ...token,
      user: data.data.user ? normalizeUser(data.data.user) : token.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || token.refreshToken,
      tokenType: tokens.tokenType || 'Bearer',
      accessTokenExpiresAt:
        Date.now() +
        parseExpiresInToMs(tokens.accessTokenExpiresIn, 15 * 60 * 1000),
      refreshTokenExpiresAt:
        Date.now() +
        parseExpiresInToMs(
          tokens.refreshTokenExpiresIn,
          7 * 24 * 60 * 60 * 1000,
        ),
      error: null,
    });
  } catch {
    return {
      ...token,
      accessToken: null,
      refreshToken: null,
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
          throw new Error('Username and password are required.');
        }

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || !data?.data?.tokens) {
          throw new Error(data?.message || 'Login failed.');
        }

        const user = normalizeUser(data.data.user);
        const tokens = data.data.tokens;

        return removeUndefined({
          ...user,
          name: user.fullName || user.username || null,
          image: null,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType || 'Bearer',
          accessTokenExpiresAt:
            Date.now() +
            parseExpiresInToMs(tokens.accessTokenExpiresIn, 15 * 60 * 1000),
          refreshTokenExpiresAt:
            Date.now() +
            parseExpiresInToMs(
              tokens.refreshTokenExpiresIn,
              7 * 24 * 60 * 60 * 1000,
            ),
        }) as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as any;

        return removeUndefined({
          ...token,
          user: {
            id: authUser.id || null,
            name: authUser.fullName || authUser.username || null,
            image: null,
            firstName: authUser.firstName || null,
            lastName: authUser.lastName || null,
            fullName: authUser.fullName || null,
            username: authUser.username || null,
            email: authUser.email || null,
            phone: authUser.phone || null,
            role: authUser.role || null,
            roleLabel: authUser.roleLabel || null,
            status: authUser.status || null,
            statusLabel: authUser.statusLabel || null,
            isActive:
              typeof authUser.isActive === 'boolean' ? authUser.isActive : null,
            profile: authUser.profile || null,
            managerId: authUser.managerId || null,
            language: authUser.language || null,
            direction: authUser.direction || null,
            lastLoginAt: authUser.lastLoginAt || null,
            telegramUserId: authUser.telegramUserId || null,
            telegramChatId: authUser.telegramChatId || null,
            telegramUsername: authUser.telegramUsername || null,
          },
          accessToken: authUser.accessToken || null,
          refreshToken: authUser.refreshToken || null,
          tokenType: authUser.tokenType || 'Bearer',
          accessTokenExpiresAt: authUser.accessTokenExpiresAt || null,
          refreshTokenExpiresAt: authUser.refreshTokenExpiresAt || null,
          error: null,
        });
      }

      if (!token.accessToken || !token.refreshToken) {
        return removeUndefined({
          ...token,
          accessToken: null,
          refreshToken: null,
          error: 'RefreshAccessTokenError',
        });
      }

      const accessTokenExpiresAt = Number(token.accessTokenExpiresAt || 0);
      const refreshTokenExpiresAt = Number(token.refreshTokenExpiresAt || 0);

      if (refreshTokenExpiresAt && Date.now() >= refreshTokenExpiresAt) {
        return removeUndefined({
          ...token,
          accessToken: null,
          refreshToken: null,
          error: 'RefreshAccessTokenError',
        });
      }

      const refreshBeforeMs = 30 * 1000;

      if (
        accessTokenExpiresAt &&
        Date.now() < accessTokenExpiresAt - refreshBeforeMs
      ) {
        return removeUndefined(token);
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      const tokenUser = (token.user || {}) as any;

      return removeUndefined({
        ...session,
        user: {
          id: tokenUser.id || null,
          name:
            tokenUser.name ||
            tokenUser.fullName ||
            tokenUser.username ||
            null,
          email: tokenUser.email || null,
          image: tokenUser.image || null,

          firstName: tokenUser.firstName || null,
          lastName: tokenUser.lastName || null,
          fullName: tokenUser.fullName || null,
          username: tokenUser.username || null,
          phone: tokenUser.phone || null,
          role: tokenUser.role || null,
          roleLabel: tokenUser.roleLabel || null,
          status: tokenUser.status || null,
          statusLabel: tokenUser.statusLabel || null,
          isActive:
            typeof tokenUser.isActive === 'boolean'
              ? tokenUser.isActive
              : null,
          profile: tokenUser.profile || null,
          managerId: tokenUser.managerId || null,
          language: tokenUser.language || null,
          direction: tokenUser.direction || null,
          lastLoginAt: tokenUser.lastLoginAt || null,
          telegramUserId: tokenUser.telegramUserId || null,
          telegramChatId: tokenUser.telegramChatId || null,
          telegramUsername: tokenUser.telegramUsername || null,
        },
        accessToken: token.accessToken || null,
        refreshToken: token.refreshToken || null,
        tokenType: token.tokenType || 'Bearer',
        accessTokenExpiresAt: token.accessTokenExpiresAt || null,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt || null,
        error: token.error || null,
      });
    },
  },
};

export default NextAuth(authOptions);