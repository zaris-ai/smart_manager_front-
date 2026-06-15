import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

type WithAuthOptions = {
  redirectTo?: string;
};

const authCookieNames = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
];

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

const clearAuthCookies = (context: GetServerSidePropsContext): void => {
  const expiredCookies = authCookieNames.map((name) => {
    return `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`;
  });

  context.res.setHeader('Set-Cookie', expiredCookies);
};

export const withAuth = <P extends Record<string, any> = Record<string, any>>(
  handler?: GetServerSideProps<P>,
  options: WithAuthOptions = {},
): GetServerSideProps => {
  return async (
    context: GetServerSidePropsContext,
  ): Promise<GetServerSidePropsResult<any>> => {
    const redirectTo = options.redirectTo || '/auth/login';

    const session = await getServerSession(
      context.req,
      context.res,
      authOptions,
    );

    if (!session || (session as any).error || !(session as any).accessToken) {
      clearAuthCookies(context);

      return {
        redirect: {
          destination: `${redirectTo}?expired=1`,
          permanent: false,
        },
      };
    }

    const safeSession = removeUndefined(session);

    if (!handler) {
      return {
        props: {
          session: safeSession,
        },
      };
    }

    const result = await handler(context);

    if ('props' in result) {
      const resolvedProps = await result.props;

      return {
        props: removeUndefined({
          ...resolvedProps,
          session: safeSession,
        }),
      };
    }

    return result;
  };
};

export default withAuth;