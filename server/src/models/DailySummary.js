import mongoose from 'mongoose';

const dailySummarySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    totalLoginHours: { type: Number, default: 0 },
    productiveHours: { type: Number, default: 0 },
    idleHours: { type: Number, default: 0 },
    tasksAssigned: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksPending: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

dailySummarySchema.index({ tenantId: 1, workspaceId: 1, employeeId: 1, date: 1 }, { unique: true });

dailySummarySchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.employeeId = String(ret.employeeId);
    ret.generatedAt = ret.generatedAt?.toISOString?.() || ret.generatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    delete ret.workspaceId;
    return ret;
  },
});

export function getDailySummaryModel(conn) {
  return conn.models.DailySummary || conn.model('DailySummary', dailySummarySchema, 'daily_summaries');
}

export { dailySummarySchema };
