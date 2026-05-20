import { verifyAccessToken } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

/**
 * requireAuth
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts a valid access token from EITHER:
 * Accepts a valid access token from:
 *   • HTTP Authorization header:  "Bearer <token>"
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, bearerToken] = authHeader.split(' ');
  const token = scheme === 'Bearer' ? bearerToken : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing access token' },
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
    });
  }
}

/**
 * requireRole
 * Unchanged — still works the same way on top of requireAuth.
 */
export function requireRole(roles) {
  return (req, res, next) => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }
    return next();
  };
}

/**
 * requireInternalUser
 * Blocks clients from accessing internal routes.
 */
export function requireInternalUser(req, res, next) {
  if (req.auth?.userType === 'client') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access restricted to internal users' },
    });
  }
  return next();
}

/**
 * verifyToken  (legacy demo middleware — kept for backward compatibility)
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = { id: '65f000000000000000000102', name: 'Sarah Chen', role: 'admin' };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    req.user = decoded;
    next();
  } catch {
    req.user = { id: '65f000000000000000000102', name: 'Sarah Chen', role: 'admin' };
    next();
  }
};
