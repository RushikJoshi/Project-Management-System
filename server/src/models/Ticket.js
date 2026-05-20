import mongoose from 'mongoose';

const ticketTypes = [
  'BUG', 'CHANGE_REQUEST', 'NEW_FEATURE', 'UI_CHANGE', 
  'URGENT_FIX', 'PERFORMANCE_ISSUE', 'SECURITY_ISSUE', 
  'CONTENT_UPDATE', 'API_CHANGE', 'OTHER'
];

const ticketStatuses = [
  'OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 
  'ON_HOLD', 'IN_PROGRESS', 'TESTING', 'CLIENT_REVIEW', 
  'REVISION_REQUIRED', 'COMPLETED', 'CLOSED'
];

const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER'];

const ticketSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    
    ticketId: { type: String, unique: true, required: true, index: true }, // Human readable ID like TKT-001
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 10000 },
    
    type: { type: String, enum: ticketTypes, default: 'OTHER', index: true },
    status: { type: String, enum: ticketStatuses, default: 'OPEN', index: true },
    priority: { type: String, enum: ticketPriorities, default: 'MEDIUM', index: true },
    
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Client or Staff
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Manager or Developer
    
    // SLA Tracking
    sla: {
      responseTimeLimit: { type: Date }, // Deadline for first response
      resolutionTimeLimit: { type: Date }, // Deadline for closure
      respondedAt: { type: Date },
      resolvedAt: { type: Date },
      isResponseBreached: { type: Boolean, default: false },
      isResolutionBreached: { type: Boolean, default: false },
    },

    // Escalation
    isEscalated: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 },
    escalatedAt: { type: Date },

    // Linked Task (when approved)
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    linkedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },

    comments: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        content: { type: String, required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        isInternal: { type: Boolean, default: false }, // If true, only visible to staff
        attachments: [
          {
            name: String,
            url: String,
            size: Number,
            type: String,
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
          }
        ],
        createdAt: { type: Date, default: Date.now }
      }
    ],

    activities: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        action: String, // e.g. "STATUS_CHANGED", "ASSIGNED", "COMMENT_ADDED"
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        details: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now }
      }
    ],

    attachments: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        name: String,
        url: String,
        size: Number,
        type: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Approval History
    approvalWorkflow: [
      {
        step: String,
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

ticketSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    ret.projectId = ret.projectId && typeof ret.projectId === 'object' && !Buffer.isBuffer(ret.projectId)
      ? {
        id: String(ret.projectId._id || ret.projectId.id || ret.projectId),
        _id: String(ret.projectId._id || ret.projectId.id || ret.projectId),
        name: ret.projectId.name,
      }
      : String(ret.projectId);
    ret.creatorId = String(ret.creatorId);
    ret.assigneeId = ret.assigneeId ? String(ret.assigneeId) : undefined;
    ret.taskId = ret.taskId ? String(ret.taskId) : undefined;
    ret.linkedTaskId = ret.linkedTaskId ? String(ret.linkedTaskId) : undefined;
    
    // Filter comments based on context? 
    // Actually, we'll handle that in the controller/service layer to ensure security.
    
    delete ret._id;
    delete ret.__v;
    delete ret.tenantId;
    delete ret.workspaceId;
    return ret;
  }
});

export function getTicketModel(conn) {
  return conn.models.Ticket || conn.model('Ticket', ticketSchema);
}

export { ticketSchema, ticketTypes, ticketStatuses, ticketPriorities };
