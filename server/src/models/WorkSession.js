import mongoose from 'mongoose';

const workSessionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date, default: null },
    totalHours: { type: Number, default: null },
    idleHours: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Completed'], default: 'Active', index: true },
    productivityScore: { type: Number, default: null },
    idleStartedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workSessionSchema.index({ tenantId: 1, workspaceId: 1, employeeId: 1, date: 1 });
workSessionSchema.index(
  { tenantId: 1, workspaceId: 1, employeeId: 1, status: 1 },
  { partialFilterExpression: { status: 'Active' } }
);

workSessionSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.employeeId = String(ret.employeeId);
    ret.loginTime = ret.loginTime?.toISOString?.() || ret.loginTime;
    ret.logoutTime = ret.logoutTime?.toISOString?.() || ret.logoutTime;
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    delete ret.workspaceId;
    return ret;
  },
});

export function getWorkSessionModel(conn) {
  return conn.models.WorkSession || conn.model('WorkSession', workSessionSchema, 'work_sessions');
}

export { workSessionSchema };
