import mongoose from 'mongoose';

const activityTypes = [
  'task_open',
  'task_update',
  'status_change',
  'comment_add',
  'file_upload',
  'idle_start',
  'idle_end',
];

const workActivityLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSession', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityType: { type: String, enum: activityTypes, required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

workActivityLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.sessionId = String(ret.sessionId);
    ret.employeeId = String(ret.employeeId);
    ret.taskId = ret.taskId ? String(ret.taskId) : undefined;
    ret.timestamp = ret.timestamp?.toISOString?.() || ret.timestamp;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    delete ret.workspaceId;
    return ret;
  },
});

export function getWorkActivityLogModel(conn) {
  return conn.models.WorkActivityLog || conn.model('WorkActivityLog', workActivityLogSchema, 'activity_logs');
}

export { workActivityLogSchema, activityTypes };
