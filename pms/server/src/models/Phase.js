import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    order: { type: Number, default: 0, index: true },
    color: { type: String, trim: true, maxlength: 32, default: '' },
  },
  { timestamps: true }
);

phaseSchema.index({ tenantId: 1, workspaceId: 1, projectId: 1, order: 1 });

phaseSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.projectId = String(ret.projectId);
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    delete ret.workspaceId;
    return ret;
  },
});

export function getPhaseModel(conn) {
  return conn.models.Phase || conn.model('Phase', phaseSchema);
}

export { phaseSchema };
