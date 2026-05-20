import mongoose from 'mongoose';
import { getTenantModels } from '../config/tenantDb.js';
import { sendTemplatedEmailSafe } from './mail.service.js';

// SLA Configuration (Response and Resolution time in minutes)
const SLA_CONFIG = {
  LOW: { response: 24 * 60, resolution: 5 * 24 * 60 },
  MEDIUM: { response: 12 * 60, resolution: 3 * 24 * 60 },
  HIGH: { response: 4 * 60, resolution: 1 * 24 * 60 },
  CRITICAL: { response: 30, resolution: 4 * 60 },
  BLOCKER: { response: 15, resolution: 2 * 60 },
};

function calculateSLA(priority, baseDate = new Date()) {
  const config = SLA_CONFIG[priority] || SLA_CONFIG.MEDIUM;
  return {
    responseTimeLimit: new Date(baseDate.getTime() + config.response * 60000),
    resolutionTimeLimit: new Date(baseDate.getTime() + config.resolution * 60000),
  };
}

export async function createTicket(companyId, workspaceId, creatorId, data) {
  const { Ticket, Project } = await getTenantModels(companyId);
  console.log('[TicketService.createTicket] Incoming payload:', data);
  console.log('[TicketService.createTicket] Received projectId:', data?.projectId);

  if (!data.projectId) {
    const err = new Error('Request missing projectId');
    err.statusCode = 400;
    err.code = 'REQUEST_PROJECT_MISSING';
    throw err;
  }
  if (!mongoose.Types.ObjectId.isValid(String(data.projectId))) {
    const err = new Error('Invalid projectId format');
    err.statusCode = 400;
    err.code = 'INVALID_PROJECT_ID_FORMAT';
    throw err;
  }
  
  let resolvedWorkspaceId = workspaceId;
  const project = await Project.findById(data.projectId).select('workspaceId status').lean();
  console.log('[TicketService.createTicket] Mongo query result:', project);
  if (!project) {
    const err = new Error('Linked project deleted');
    err.statusCode = 404;
    err.code = 'PROJECT_NOT_FOUND';
    throw err;
  }
  if (project.status === 'archived') {
    const err = new Error('Project archived');
    err.statusCode = 400;
    err.code = 'PROJECT_ARCHIVED';
    throw err;
  }
  if (resolvedWorkspaceId && String(project.workspaceId) !== String(resolvedWorkspaceId)) {
    const err = new Error('Linked project belongs to a different workspace');
    err.statusCode = 400;
    err.code = 'PROJECT_WORKSPACE_MISMATCH';
    throw err;
  }
  if (!resolvedWorkspaceId) {
    resolvedWorkspaceId = project.workspaceId;
  }

  // Generate human-readable ticket ID
  const count = await Ticket.countDocuments({ tenantId: companyId });
  const ticketId = `TKT-${String(count + 1).padStart(4, '0')}`;
  
  const sla = calculateSLA(data.priority);

  const ticket = new Ticket({
    tenantId: companyId,
    workspaceId: resolvedWorkspaceId,
    projectId: data.projectId,
    ticketId,
    title: data.title,
    description: data.description,
    type: data.type,
    priority: data.priority,
    creatorId,
    sla,
    status: 'OPEN',
    attachments: data.attachments || [],
    activities: [{
      action: 'TICKET_CREATED',
      actorId: creatorId,
      details: { message: 'Ticket raised' }
    }]
  });

  await ticket.save();
  return ticket;
}

export async function listTickets(companyId, workspaceId, filters = {}, userContext = {}) {
  const { Ticket } = await getTenantModels(companyId);
  const { userId, role, userType, clientId } = userContext;

  const query = { tenantId: companyId, workspaceId };

  // Visibility logic: Clients only see their own tickets or tickets for their projects
  if (userType === 'client' || (typeof role === 'string' && role.startsWith('CLIENT_'))) {
    query.$or = [
      { creatorId: userId },
      { clientId: clientId }
    ];
  }

  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.priority) query.priority = filters.priority;

  const tickets = await Ticket.find(query)
    .sort({ createdAt: -1 })
    .populate('creatorId', 'name avatar color')
    .populate('assigneeId', 'name avatar color')
    .populate('projectId', 'name');

  // Dynamic SLA Check
  const now = new Date();
  tickets.forEach(ticket => {
    if (!ticket.sla.respondedAt && ticket.sla.responseTimeLimit < now) {
      ticket.sla.isResponseBreached = true;
    }
    if (!ticket.sla.resolvedAt && ticket.sla.resolutionTimeLimit < now && ticket.status !== 'CLOSED') {
      ticket.sla.isResolutionBreached = true;
    }
  });

  return tickets;
}

export async function getAnalytics(companyId, workspaceId, userContext = {}) {
  const { Ticket } = await getTenantModels(companyId);
  const { userId, role, userType, clientId } = userContext;

  const query = { 
    tenantId: new mongoose.Types.ObjectId(companyId), 
    workspaceId: new mongoose.Types.ObjectId(workspaceId) 
  };

  if (userType === 'client' || (typeof role === 'string' && role.startsWith('CLIENT_'))) {
    query.$or = [
      { creatorId: new mongoose.Types.ObjectId(userId) },
      { clientId: new mongoose.Types.ObjectId(clientId) }
    ];
  }

  const { Task } = await getTenantModels(companyId);
  const taskCollectionName = Task.collection.name;

  const now = new Date();

  const analytics = await Ticket.aggregate([
    { $match: query },
    {
      $addFields: {
        taskIdObj: {
          $cond: [
            { $and: [{ $ne: ['$linkedTaskId', null] }, { $ne: ['$linkedTaskId', ''] }] },
            { $toObjectId: '$linkedTaskId' },
            null
          ]
        }
      }
    },
    {
      $lookup: {
        from: taskCollectionName,
        localField: 'taskIdObj',
        foreignField: '_id',
        as: 'task'
      }
    },
    {
      $unwind: {
        path: '$task',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
        underReview: { $sum: { $cond: [{ $eq: ['$status', 'UNDER_REVIEW'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
        resolved: { 
          $sum: { 
            $cond: [
              { 
                $or: [
                  { $in: ['$status', ['RESOLVED', 'COMPLETED', 'CLOSED']] },
                  { $eq: ['$task.status', 'done'] },
                  { $eq: ['$task.status', 'completed'] }
                ] 
              }, 
              1, 
              0
            ] 
          } 
        },
        critical: { $sum: { $cond: [{ $in: ['$priority', ['HIGH', 'CRITICAL', 'BLOCKER']] }, 1, 0] } },
        slaBreached: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $and: [{ $not: ['$sla.respondedAt'] }, { $lt: ['$sla.responseTimeLimit', now] }] },
                  { $and: [{ $not: ['$sla.resolvedAt'] }, { $lt: ['$sla.resolutionTimeLimit', now] }, { $ne: ['$status', 'CLOSED'] }] }
                ]
              },
              1,
              0
            ]
          }
        },
        delayed: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $and: [{ $not: ['$sla.respondedAt'] }, { $lt: ['$sla.responseTimeLimit', now] }] },
                  { $and: [{ $not: ['$sla.resolvedAt'] }, { $lt: ['$sla.resolutionTimeLimit', now] }, { $ne: ['$status', 'CLOSED'] }] }
                ]
              },
              1,
              0
            ]
          }
        },
        clientReviewPending: { $sum: { $cond: [{ $eq: ['$status', 'CLIENT_REVIEW'] }, 1, 0] } }
      }
    }
  ]);

  return analytics[0] || {
    total: 0,
    open: 0,
    underReview: 0,
    approved: 0,
    inProgress: 0,
    resolved: 0,
    critical: 0,
    slaBreached: 0,
    delayed: 0,
    clientReviewPending: 0
  };
}

export async function getTicketDetails(companyId, ticketId, userContext = {}) {
  const { Ticket } = await getTenantModels(companyId);
  const { userType } = userContext;

  const ticket = await Ticket.findById(ticketId)
    .populate('creatorId', 'name avatar color')
    .populate('assigneeId', 'name avatar color')
    .populate('projectId', 'name')
    .populate('activities.actorId', 'name avatar color')
    .populate('comments.authorId', 'name avatar color');

  if (!ticket) throw new Error('Ticket not found');

  // Filter internal comments for clients
  if (userType === 'client') {
    ticket.comments = ticket.comments.filter(c => !c.isInternal);
  }

  return ticket;
}

export async function updateTicketStatus(companyId, ticketId, actorId, status, note = '', taskId = null) {
  const { Ticket, Task, Notification } = await getTenantModels(companyId);
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const oldStatus = ticket.status;
  let nextStatus = status;
  if (status === 'APPROVED' && taskId) {
    nextStatus = 'IN_PROGRESS';
  }
  ticket.status = nextStatus;
  
  ticket.activities.push({
    action: 'STATUS_CHANGED',
    actorId,
    details: { from: oldStatus, to: nextStatus, note }
  });

  // Approval logic -> Task generation (DISABLED in favor of frontend modal)
  /*
  if (status === 'APPROVED' && !ticket.taskId) {
    const task = new Task({
      tenantId: companyId,
      workspaceId: ticket.workspaceId,
      projectId: ticket.projectId,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority.toLowerCase() === 'blocker' ? 'urgent' : ticket.priority.toLowerCase(),
      status: 'todo',
      reporterId: actorId,
      assigneeIds: [actorId],
      dueDate: ticket.sla.resolutionTimeLimit,
      ticketId: ticket._id, // Linked ticket ID
    });
    await task.save();
    ticket.taskId = task._id;
  }
  */
  
  if (status === 'APPROVED' && taskId) {
    ticket.taskId = taskId;
    ticket.linkedTaskId = taskId;
    ticket.activities.push({
      action: 'TASK_CREATED',
      actorId,
      details: { taskId, note: note || 'Task created from request' }
    });
  }

  if (status === 'CLOSED' || status === 'COMPLETED') {
    ticket.sla.resolvedAt = new Date();
    if (ticket.sla.resolvedAt > ticket.sla.resolutionTimeLimit) {
      ticket.sla.isResolutionBreached = true;
    }
  }

  await ticket.save();
  if (status === 'APPROVED' && taskId) {
    const task = await Task.findById(taskId).select('title assigneeIds').lean();
    const notifyIds = Array.from(new Set([
      String(ticket.creatorId),
      ...(task?.assigneeIds || []).map((id) => String(id)),
    ].filter((id) => id && id !== String(actorId))));
    if (notifyIds.length) {
      await Notification.insertMany(
        notifyIds.map((userId) => ({
          tenantId: companyId,
          workspaceId: ticket.workspaceId,
          userId,
          type: 'request_task_created',
          title: 'Request approved',
          message: task?.title
            ? `Your request was approved and linked to "${task.title}".`
            : 'Your request was approved and linked to a task.',
          isRead: false,
          relatedId: String(taskId),
        }))
      );
    }
  }
  return ticket;
}

export async function addTicketComment(companyId, ticketId, authorId, data) {
  const { Ticket } = await getTenantModels(companyId);
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const comment = {
    content: data.content,
    authorId,
    isInternal: !!data.isInternal,
    attachments: data.attachments || []
  };

  ticket.comments.push(comment);
  
  // SLA First Response tracking
  if (!ticket.sla.respondedAt && !comment.isInternal && String(authorId) !== String(ticket.creatorId)) {
    ticket.sla.respondedAt = new Date();
    if (ticket.sla.respondedAt > ticket.sla.responseTimeLimit) {
      ticket.sla.isResponseBreached = true;
    }
  }

  ticket.activities.push({
    action: 'COMMENT_ADDED',
    actorId: authorId,
    details: { isInternal: comment.isInternal }
  });

  await ticket.save();
  return ticket;
}

export async function assignTicket(companyId, ticketId, actorId, assigneeId) {
  const { Ticket } = await getTenantModels(companyId);
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const oldAssignee = ticket.assigneeId;
  ticket.assigneeId = assigneeId;
  
  ticket.activities.push({
    action: 'TICKET_ASSIGNED',
    actorId,
    details: { from: oldAssignee, to: assigneeId }
  });

  await ticket.save();
  return ticket;
}
