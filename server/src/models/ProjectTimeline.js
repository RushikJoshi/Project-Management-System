import mongoose from 'mongoose';

const projectTimelineSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  status: { type: String, enum: ['Draft', 'Approved'], default: 'Draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  settings: {
    zoom: { type: String, enum: ['day', 'week', 'month'], default: 'week' },
    baselineVisible: { type: Boolean, default: true },
    showCriticalPath: { type: Boolean, default: true },
  },
}, { timestamps: true });

export function getProjectTimelineModel(conn) {
  return conn.models.ProjectTimeline || conn.model('ProjectTimeline', projectTimelineSchema);
}

export { projectTimelineSchema };

