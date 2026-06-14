import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
    accessTokenExpiresAt?: number;
    error?: string;

    user: {
      id: string;
      username: string;
      role?: string;
      roleLabel?: string;
      accessLevel?: number;
      permissions?: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    roleLabel?: string;
    accessLevel?: number;
    permissions?: string[];

    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
    accessTokenExpiresAt: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    username?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    roleLabel?: string;
    accessLevel?: number;
    permissions?: string[];

    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
    accessTokenExpiresAt?: number;
    error?: string;
  }
}