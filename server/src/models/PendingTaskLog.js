import mongoose from 'mongoose';

const blockerTypes = ['Client', 'Technical', 'Dependency', 'Other'];

const pendingTaskLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSession', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    reason: { type: String, required: true, trim: true, minlength: 20, maxlength: 10000 },
    blockerType: { type: String, enum: blockerTypes, required: true },
    expectedCompletion: { type: Date, required: true },
    submittedAt: { type: Date, default: Date.now, index: true },
    extensionRequested: { type: Boolean, default: false, index: true },
    managerApproved: { type: Boolean, default: null, index: true },
    managerComment: { type: String, trim: true, maxlength: 5000, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

pendingTaskLogSchema.index({ tenantId: 1, workspaceId: 1, employeeId: 1, submittedAt: -1 });

pendingTaskLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.sessionId = String(ret.sessionId);
    ret.employeeId = String(ret.employeeId);
    ret.taskId = ret.taskId && typeof ret.taskId === 'object'
      ? {
        id: String(ret.taskId._id || ret.taskId.id || ret.taskId),
        title: ret.taskId.title,
        status: ret.taskId.status,
        dueDate: ret.taskId.dueDate ? new Date(ret.taskId.dueDate).toISOString().split('T')[0] : undefined,
      }
      : String(ret.taskId);
    ret.expectedCompletion = ret.expectedCompletion?.toISOString?.() || ret.expectedCompletion;
    ret.submittedAt = ret.submittedAt?.toISOString?.() || ret.submittedAt;
    ret.reviewedAt = ret.reviewedAt?.toISOString?.() || ret.reviewedAt;
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    delete ret.workspaceId;
    return ret;
  },
});

export function getPendingTaskLogModel(conn) {
  return conn.models.PendingTaskLog || conn.model('PendingTaskLog', pendingTaskLogSchema, 'pending_task_logs');
}

export { pendingTaskLogSchema, blockerTypes };
