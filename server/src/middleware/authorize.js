import { getEffectivePermissions } from '../services/rbac.service.js';
import { getTenantModels } from '../config/tenantDb.js';

/**
 * Middleware to enforce a specific permission.
 * Fails with 403 Forbidden if the user lacks the permission.
 * 
 * @param {String} requiredPermission - The permission key from PERMISSIONS
 */
export function authorize(requiredPermission) {
  return async (req, res, next) => {
    try {
      // auth token payload has { sub, companyId, role, name }
      const { companyId, sub: userId, role } = req.auth || req.user || {};
      
      if (!companyId || !userId) {
         return res.status(401).json({ success: false, message: 'Unauthorized. Invalid token structure.' });
      }

      const { User } = await getTenantModels(companyId);
      const user = await User.findById(userId).lean();

      if (!user) {
         return res.status(401).json({ success: false, message: 'Unauthorized. User not found.' });
      }

      // Fast path for legacy migration compatibility: 
      // If the user's legacy role is super_admin, or they have the isSuperAdmin flag
      if (role === 'super_admin' || user.isSuperAdmin) {
        return next();
      }

      // Bypass for internal users on client-specific permissions
      if (user.userType !== 'client' && requiredPermission && requiredPermission.startsWith('client.')) {
        return next();
      }

      const perms = await getEffectivePermissions(user, companyId);
      
      if (perms.includes('*') || perms.includes(requiredPermission)) {
        return next();
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Missing required permission: ' + requiredPermission 
      });
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Middleware to enforce AT LEAST ONE of the provided permissions.
 * 
 * @param {Array<String>} permissionsArray - Array of permission keys
 */
export function authorizeAny(permissionsArray) {
  return async (req, res, next) => {
    try {
      const { companyId, sub: userId, role } = req.auth || req.user || {};

      if (!companyId || !userId) {
         return res.status(401).json({ success: false, message: 'Unauthorized. Invalid token structure.' });
      }

      const { User } = await getTenantModels(companyId);
      const user = await User.findById(userId).lean();

      if (!user) {
         return res.status(401).json({ success: false, message: 'Unauthorized. User not found.' });
      }

      if (role === 'super_admin' || user.isSuperAdmin) {
        return next();
      }

      // Bypass for internal users on client-specific permissions
      if (user.userType !== 'client' && permissionsArray.some(p => p.startsWith('client.'))) {
        return next();
      }

      const perms = await getEffectivePermissions(user, companyId);
      
      if (perms.includes('*') || permissionsArray.some(p => perms.includes(p))) {
        return next();
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Requires one of: ' + permissionsArray.join(', ')
      });
    } catch (e) {
      next(e);
    }
  };
}
