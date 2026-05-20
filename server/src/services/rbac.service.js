import { getTenantModels } from '../config/tenantDb.js';

const CLIENT_ROLE_PERMISSIONS = {
  'CLIENT_ADMIN': [
    'client.project.view', 'client.task.view', 'client.request.create', 'client.request.update', 
    'client.request.comment', 'client.review.approve', 'client.file.upload', 'client.file.download', 
    'client.chat.send', 'client.user.invite', 'client.analytics.view', 'client.report.export'
  ],
  'CLIENT_MANAGER': [
    'client.project.view', 'client.task.view', 'client.request.create', 'client.request.comment', 
    'client.file.upload', 'client.file.download', 'client.chat.send', 'client.report.view'
  ],
  'CLIENT_REVIEWER': [
    'client.project.view', 'client.task.view', 'client.request.comment', 'client.review.approve', 
    'client.file.upload', 'client.file.download', 'client.chat.send'
  ],
  'CLIENT_VIEWER': [
    'client.project.view', 'client.task.view', 'client.file.download'
  ]
};

/**
 * Calculates the total effective permissions for a user.
 * Effective = (Role Permissions + Custom Permissions) - Denied Permissions
 * 
 * In a real-world enterprise environment, you'd add Redis caching here to avoid repeated DB calls.
 * 
 * @param {Object} user - The user document or object containing roleIds, customPermissions, deniedPermissions, isSuperAdmin
 * @param {String} companyId - The tenantId
 * @returns {Array<String>} - Array of effective permission keys. Includes '*' if super admin.
 */
export async function getEffectivePermissions(user, companyId) {
  if (!user) return [];
  if (user.isSuperAdmin) return ['*'];

  const { Role } = await getTenantModels(companyId);
  
  let rolePermissions = [];

  // Add hardcoded client permissions if applicable
  if (user.role && CLIENT_ROLE_PERMISSIONS[user.role]) {
    rolePermissions.push(...CLIENT_ROLE_PERMISSIONS[user.role]);
  }
  if (user.roleIds && user.roleIds.length > 0) {
    const roles = await Role.find({ _id: { $in: user.roleIds }, tenantId: companyId }).lean();
    roles.forEach(r => {
      if (r.permissions && Array.isArray(r.permissions)) {
        rolePermissions.push(...r.permissions);
      }
    });
  }

  const effective = new Set([
    ...rolePermissions,
    ...(user.customPermissions || [])
  ]);

  (user.deniedPermissions || []).forEach(p => {
    effective.delete(p);
  });

  return Array.from(effective);
}

/**
 * Validates if the user has a specific permission.
 */
export async function hasPermission(user, companyId, permissionKey) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const perms = await getEffectivePermissions(user, companyId);
  return perms.includes('*') || perms.includes(permissionKey);
}

/**
 * Validates if the user has AT LEAST ONE of the provided permissions.
 */
export async function hasAnyPermission(user, companyId, permissionKeys = []) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;

  const perms = await getEffectivePermissions(user, companyId);
  if (perms.includes('*')) return true;

  return permissionKeys.some(key => perms.includes(key));
}
