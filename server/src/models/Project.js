import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    projectCode: { type: String, trim: true, unique: true, sparse: true },
    description: { type: String, trim: true, maxlength: 4000 },
    color: { type: String, required: true, trim: true, maxlength: 32 },
    status: { type: String, enum: ['active', 'on_hold', 'completed', 'archived'], default: 'active', index: true },
    department: { type: String, trim: true, maxlength: 120, default: 'General' },
    branchId: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
    visibleToClient: { type: Boolean, default: false },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    reportingPersonIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    linkedTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminConversation', default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    budget: { type: Number, default: null, min: 0 },
    budgetCurrency: { type: String, trim: true, maxlength: 8, default: 'INR' },
    sdlcPlan: [{
      name: { type: String, trim: true, maxlength: 120, required: true },
      durationDays: { type: Number, min: 0, default: 0 },
      notes: { type: String, trim: true, maxlength: 500, default: '' },
    }],
    subcategories: [{
      id: { type: String, required: true },
      name: { type: String, trim: true, maxlength: 200, required: true },
      description: { type: String, trim: true, maxlength: 1000, default: '' },
      color: { type: String, trim: true, maxlength: 32, default: '#6366f1' },
      order: { type: Number, default: 0 },
    }],
    totalPlannedDurationDays: { type: Number, default: 0, min: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    tasksCount: { type: Number, default: 0, min: 0 },
    completedTasksCount: { type: Number, default: 0, min: 0 },
    pendingTasksCount: { type: Number, default: 0, min: 0 },
    overdueTasksCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

projectSchema.index({ workspaceId: 1, status: 1 });
projectSchema.index({ workspaceId: 1, department: 1 });
projectSchema.index({ workspaceId: 1, name: 'text' });

projectSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.workspaceId = String(ret.workspaceId);
    ret.ownerId = String(ret.ownerId);
    ret.leadId = ret.leadId ? String(ret.leadId) : undefined;
    ret.teamId = ret.teamId ? String(ret.teamId) : undefined;
    ret.linkedTeamId = ret.linkedTeamId ? String(ret.linkedTeamId) : undefined;
    ret.members = Array.isArray(ret.members) ? ret.members.map((m) => String(m)) : [];
    ret.reportingPersonIds = Array.isArray(ret.reportingPersonIds) ? ret.reportingPersonIds.map((m) => String(m)) : [];
    ret.chatId = ret.chatId ? String(ret.chatId) : undefined;
    ret.createdAt = ret.createdAt?.toISOString?.() || ret.createdAt;
    ret.updatedAt = ret.updatedAt?.toISOString?.() || ret.updatedAt;
    ret.startDate = ret.startDate ? new Date(ret.startDate).toISOString().split('T')[0] : undefined;
    ret.endDate = ret.endDate ? new Date(ret.endDate).toISOString().split('T')[0] : undefined;
    ret.budget = typeof ret.budget === 'number' ? ret.budget : undefined;
    ret.budgetCurrency = ret.budgetCurrency || 'INR';
    ret.sdlcPlan = Array.isArray(ret.sdlcPlan)
      ? ret.sdlcPlan.map((phase) => ({
        id: String(phase._id || phase.id),
        name: phase.name,
        durationDays: Number(phase.durationDays) || 0,
        notes: phase.notes || '',
      }))
      : [];
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    return ret;
  },
});

export function getProjectModel(conn) {
  return conn.models.Project || conn.model('Project', projectSchema);
}

export { projectSchema };

