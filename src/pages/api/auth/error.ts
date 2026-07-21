import type { NextApiRequest, NextApiResponse } from 'next';

const readQueryValue = (value: string | string[] | undefined): string => {
  return Array.isArray(value) ? value[0] || '' : value || '';
};

export default function authErrorHandler(
  req: NextApiRequest,
  res: NextApiResponse,
): void {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }

  const error = readQueryValue(req.query.error).trim();
  const query = error ? `?error=${encodeURIComponent(error)}` : '';

  res.redirect(302, `/auth/login${query}`);
}
