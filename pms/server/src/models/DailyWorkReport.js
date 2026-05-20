import mongoose from 'mongoose';

const employeeSummarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, trim: true, maxlength: 200, default: '' },
    role: { type: String, trim: true, maxlength: 40, default: 'team_member' },
    assignedOpenTasks: { type: Number, default: 0, min: 0 },
    completedToday: { type: Number, default: 0, min: 0 },
    dueToday: { type: Number, default: 0, min: 0 },
    overdueOpen: { type: Number, default: 0, min: 0 },
    approvedTasks: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    performanceScore: { type: Number, default: 0, min: 0, max: 100 },
    workItems: [
      {
        kind: { type: String, enum: ['project_task', 'quick_task'], required: true },
        id: { type: String, required: true },
        title: { type: String, required: true, trim: true, maxlength: 300 },
        status: { type: String, required: true, trim: true, maxlength: 40 },
        priority: { type: String, trim: true, maxlength: 40, default: 'medium' },
        dueDate: { type: String, trim: true, maxlength: 20, default: '' },
        projectId: { type: String, default: '' },
        projectName: { type: String, trim: true, maxlength: 200, default: '' },
      },
    ],
    analysis: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { _id: false }
);

const dailyWorkReportSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    reportDate: { type: String, required: true, trim: true, maxlength: 10, index: true },
    summary: {
      employeesCount: { type: Number, default: 0, min: 0 },
      activeEmployees: { type: Number, default: 0, min: 0 },
      totalOpenTasks: { type: Number, default: 0, min: 0 },
      totalCompletedToday: { type: Number, default: 0, min: 0 },
      totalDueToday: { type: Number, default: 0, min: 0 },
      totalOverdueOpen: { type: Number, default: 0, min: 0 },
      averagePerformanceScore: { type: Number, default: 0, min: 0, max: 100 },
      topPerformerName: { type: String, trim: true, maxlength: 160, default: '' },
      topPerformerScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    employeeSummaries: { type: [employeeSummarySchema], default: [] },
    analysis: {
      headline: { type: String, trim: true, maxlength: 300, default: '' },
      strengths: { type: [String], default: [] },
      risks: { type: [String], default: [] },
      recommendations: { type: [String], default: [] },
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

dailyWorkReportSchema.index({ tenantId: 1, workspaceId: 1, reportDate: 1 }, { unique: true });

dailyWorkReportSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.workspaceId = String(ret.workspaceId);
    ret.reportDate = ret.reportDate;
    ret.generatedAt = ret.generatedAt?.toISOString?.() || ret.generatedAt;
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    ret.employeeSummaries = Array.isArray(ret.employeeSummaries)
      ? ret.employeeSummaries.map((item) => ({
          ...item,
          userId: String(item.userId),
        }))
      : [];
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

export function getDailyWorkReportModel(conn) {
  return conn.models.DailyWorkReport || conn.model('DailyWorkReport', dailyWorkReportSchema);
}

export { dailyWorkReportSchema };
