export function createAuthMiddleware(childService) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing bearer token' } });
    }
    const token = header.slice(7).trim();
    const child = childService.validateSession(token);
    if (!child) {
      return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid or expired token' } });
    }
    req.child = child;
    req.sessionToken = token;
    next();
  };
}
