import { getTenantModels } from '../config/tenantDb.js';
import { PERMISSION_REGISTRY, PERMISSIONS } from '../config/permissions.config.js';
import { getEffectivePermissions } from '../services/rbac.service.js';

// Get all system permissions (for UI rendering)
export async function getPermissionRegistry(req, res, next) {
  try {
    const { companyId } = req.auth;
    const { CustomPermission } = await getTenantModels(companyId);

    const customPerms = await CustomPermission.find({ tenantId: companyId }).lean();
    
    // Merge custom permissions into registry
    const registry = JSON.parse(JSON.stringify(PERMISSION_REGISTRY));
    
    customPerms.forEach(cp => {
      let mod = registry.find(m => m.module === cp.module);
      if (!mod) {
        mod = { module: cp.module, permissions: [] };
        registry.push(mod);
      }
      mod.permissions.push({
        key: cp.key,
        label: cp.label,
        description: cp.description
      });
    });

    return res.status(200).json({
      success: true,
      data: registry
    });
  } catch (e) {
    next(e);
  }
}

// Create custom permission
export async function createCustomPermission(req, res, next) {
  try {
    const { companyId } = req.auth;
    const { CustomPermission } = await getTenantModels(companyId);
    const { module, key, label, description } = req.body;

    if (!module || !key || !label) {
      return res.status(400).json({ success: false, message: 'Module, key, and label are required' });
    }

    // validate key format (e.g. module.action)
    if (!/^[a-z0-9_]+\.[a-z0-9_.]+$/.test(key)) {
      return res.status(400).json({ success: false, message: 'Invalid permission key format. Example: "custom.view"' });
    }

    const exists = await CustomPermission.findOne({ tenantId: companyId, key });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Permission key already exists' });
    }

    const cp = await CustomPermission.create({
      tenantId: companyId,
      module,
      key,
      label,
      description
    });

    return res.status(201).json({ success: true, data: cp });
  } catch (e) {
    next(e);
  }
}

// Roles CRUD
export async function listRoles(req, res, next) {
  try {
    const { companyId } = req.auth;
    const { Role } = await getTenantModels(companyId);
    
    const roles = await Role.find({ tenantId: companyId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: roles });
  } catch (e) {
    next(e);
  }
}

export async function createRole(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId } = req.auth;
    const { name, description, permissions } = req.body;
    const { Role } = await getTenantModels(companyId);
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    const exists = await Role.findOne({ tenantId: companyId, slug });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }
    
    const role = await Role.create({
      tenantId: companyId,
      workspaceId,
      name,
      slug,
      description,
      permissions: permissions || [],
      createdBy: userId,
      isSystemRole: false
    });
    
    return res.status(201).json({ success: true, data: role });
  } catch (e) {
    next(e);
  }
}

export async function updateRole(req, res, next) {
  try {
    const { companyId, sub: userId } = req.auth;
    const { Role, PermissionAudit } = await getTenantModels(companyId);
    const { name, description, permissions } = req.body;
    
    const role = await Role.findOne({ _id: req.params.id, tenantId: companyId });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    
    // Log audit
    await PermissionAudit.create({
      tenantId: companyId,
      actorId: userId,
      targetRoleId: role._id,
      action: 'ROLE_UPDATED',
      changes: {
        oldValue: role.permissions,
        newValue: permissions
      }
    });

    if (name) {
      role.name = name;
      role.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    
    await role.save();
    return res.status(200).json({ success: true, data: role });
  } catch (e) {
    next(e);
  }
}

export async function deleteRole(req, res, next) {
  try {
    const { companyId } = req.auth;
    const { Role, User } = await getTenantModels(companyId);
    
    const role = await Role.findOne({ _id: req.params.id, tenantId: companyId });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    
    if (role.isSystemRole) {
      return res.status(400).json({ success: false, message: 'Cannot delete system roles' });
    }
    
    // Check if role is in use
    const usersWithRole = await User.countDocuments({ tenantId: companyId, roleIds: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete role. It is assigned to ${usersWithRole} users.` });
    }
    
    await role.deleteOne();
    return res.status(200).json({ success: true, data: { ok: true } });
  } catch (e) {
    next(e);
  }
}

// User Permission Overrides
export async function getUserPermissions(req, res, next) {
  try {
    const { companyId } = req.auth;
    const { User, Role } = await getTenantModels(companyId);
    
    const user = await User.findOne({ _id: req.params.userId, tenantId: companyId }).populate('roleIds');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const effective = await getEffectivePermissions(user, companyId);
    
    return res.status(200).json({
      success: true,
      data: {
        roleIds: user.roleIds,
        customPermissions: user.customPermissions || [],
        deniedPermissions: user.deniedPermissions || [],
        effectivePermissions: effective,
        isSuperAdmin: user.isSuperAdmin
      }
    });
  } catch (e) {
    next(e);
  }
}

export async function updateUserPermissions(req, res, next) {
  try {
    const { companyId, sub: actorId } = req.auth;
    const { User, PermissionAudit } = await getTenantModels(companyId);
    const { roleIds, customPermissions, deniedPermissions } = req.body;
    
    const user = await User.findOne({ _id: req.params.userId, tenantId: companyId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Log audit
    await PermissionAudit.create({
      tenantId: companyId,
      actorId,
      targetUserId: user._id,
      action: 'USER_PERMISSIONS_OVERRIDDEN',
      changes: {
        oldValue: { roleIds: user.roleIds, custom: user.customPermissions, denied: user.deniedPermissions },
        newValue: { roleIds, custom: customPermissions, denied: deniedPermissions }
      }
    });

    if (roleIds !== undefined) user.roleIds = roleIds;
    if (customPermissions !== undefined) user.customPermissions = customPermissions;
    if (deniedPermissions !== undefined) user.deniedPermissions = deniedPermissions;
    
    await user.save();
    return res.status(200).json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
}
