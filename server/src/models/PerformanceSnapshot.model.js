import mongoose from 'mongoose';

const performanceSnapshotSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  workspaceId: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // UserId or TeamId
  entityType: { type: String, enum: ['user', 'team'], required: true },
  snapshotDate: { type: Date, default: Date.now },
  metrics: {
    productivityScore: Number,
    efficiency: Number,
    reliability: Number,
    tasksCompleted: Number,
    hoursLogged: Number
  }
}, { timestamps: true });

// Index for quick trend lookups
performanceSnapshotSchema.index({ tenantId: 1, workspaceId: 1, entityId: 1, snapshotDate: -1 });

export const getPerformanceSnapshotModel = (conn) => conn.model('PerformanceSnapshot', performanceSnapshotSchema);

export default performanceSnapshotSchema;
