import mongoose from 'mongoose';

const timeLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    type: { type: String, enum: ['manual', 'timer', 'auto'], default: 'timer' },
    isOvertime: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 1000 }
  },
  { timestamps: true }
);

timeLogSchema.index({ tenantId: 1, userId: 1, startTime: -1 });
timeLogSchema.index({ tenantId: 1, taskId: 1 });

timeLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.workspaceId = String(ret.workspaceId);
    ret.taskId = String(ret.taskId);
    ret.userId = String(ret.userId);
    ret.teamId = ret.teamId ? String(ret.teamId) : undefined;
    ret.startTime = ret.startTime?.toISOString?.() || ret.startTime;
    ret.endTime = ret.endTime?.toISOString?.() || ret.endTime;
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

export function getTimeLogModel(conn) {
  return conn.models.TimeLog || conn.model('TimeLog', timeLogSchema);
}

export { timeLogSchema };
