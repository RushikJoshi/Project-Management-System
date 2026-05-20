import mongoose from 'mongoose';

const performanceMetricSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    entityType: { type: String, enum: ['USER', 'TEAM', 'PROJECT'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    period: { type: String, required: true, index: true }, // e.g. '2026-W20', '2026-05'
    metrics: {
      tasksAssigned: { type: Number, default: 0 },
      tasksCompleted: { type: Number, default: 0 },
      tasksDelayed: { type: Number, default: 0 },
      tasksReopened: { type: Number, default: 0 },
      qaPassRate: { type: Number, default: 100 }, // Percentage
      totalHoursLogged: { type: Number, default: 0 },
      expectedHours: { type: Number, default: 0 },
      productivityScore: { type: Number, default: 0 }, // Computed 0-100
      velocity: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

performanceMetricSchema.index({ tenantId: 1, entityType: 1, entityId: 1, period: 1 }, { unique: true });

performanceMetricSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.workspaceId = String(ret.workspaceId);
    ret.entityId = String(ret.entityId);
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

export function getPerformanceMetricModel(conn) {
  return conn.models.PerformanceMetric || conn.model('PerformanceMetric', performanceMetricSchema);
}

export { performanceMetricSchema };
