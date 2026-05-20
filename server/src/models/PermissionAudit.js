import mongoose from 'mongoose';

const permissionAuditSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    action: { type: String, required: true },
    changes: {
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export function getPermissionAuditModel(conn) {
  return conn.models.PermissionAudit || conn.model('PermissionAudit', permissionAuditSchema);
}

export { permissionAuditSchema };
