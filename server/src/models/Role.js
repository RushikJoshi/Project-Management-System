import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    isSystemRole: { type: Boolean, default: false },
    permissions: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roleSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export function getRoleModel(conn) {
  return conn.models.Role || conn.model('Role', roleSchema);
}

export { roleSchema };
