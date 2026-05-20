import mongoose from 'mongoose';

const misSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    week: { type: String, required: true }, // e.g. "MAR-WEEK-2"
    
    status: { 
      type: String, 
      enum: ['draft', 'submitted', 'approved', 'rejected'], 
      default: 'draft' 
    },
    
    goals: [
      {
        target: { type: String, required: true, trim: true, maxlength: 500 },
        actual: { type: String, trim: true, maxlength: 500 },
        status: { type: String, enum: ['Done', 'In Progress', 'Pending'], required: true, default: 'Pending' },
        comment: { type: String, trim: true, maxlength: 1000 }
      }
    ],
    
    learnings: [
      {
        challenge: { type: String, required: true, trim: true, maxlength: 1000 },
        lesson: { type: String, required: true, trim: true, maxlength: 1000 }
      }
    ],
    
    keyTasks: [
      {
        task: { type: String, required: true, trim: true, maxlength: 500 },
        status: { type: String, enum: ['Done', 'In Progress', 'Pending'], required: true, default: 'Pending' },
        comment: { type: String, trim: true, maxlength: 1000 }
      }
    ],
    
    managerComment: { type: String, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

// Optional: unique constraint to ensure one MIS per user per week per project (or just user+week)
// Let's make it user + week only for simplicity, unless project is strongly partitioned
// The user prompt didn't say strict unique, but said "Store MIS per employee per week".
misSchema.index({ tenantId: 1, employeeId: 1, week: 1 }, { unique: false });

misSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export function getMISModel(conn) {
  return conn.models.MIS || conn.model('MIS', misSchema);
}

export { misSchema };
