import * as TicketService from '../services/ticket.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const createTicket = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const workspaceId = req.headers['x-workspace-id'] || req.body.workspaceId;
  const userId = req.auth?.sub;

  const ticket = await TicketService.createTicket(companyId, workspaceId, userId, req.body);
  res.status(201).json({ status: 'success', data: ticket });
});

export const listTickets = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const workspaceId = req.headers['x-workspace-id'] || req.auth?.workspaceId;
  const userContext = {
    userId: req.auth?.sub,
    role: req.auth?.role,
    userType: req.auth?.userType,
    clientId: req.auth?.clientId
  };

  const tickets = await TicketService.listTickets(companyId, workspaceId, req.query, userContext);
  res.json({ status: 'success', data: tickets });
});

export const getAnalytics = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const workspaceId = req.headers['x-workspace-id'] || req.auth?.workspaceId;
  const userContext = {
    userId: req.auth?.sub,
    role: req.auth?.role,
    userType: req.auth?.userType,
    clientId: req.auth?.clientId
  };

  const analytics = await TicketService.getAnalytics(companyId, workspaceId, userContext);
  res.json({ status: 'success', data: analytics });
});

export const getTicketDetails = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const { id } = req.params;
  const userContext = {
    userId: req.auth?.sub,
    role: req.auth?.role,
    userType: req.auth?.userType,
    clientId: req.auth?.clientId
  };

  const ticket = await TicketService.getTicketDetails(companyId, id, userContext);
  res.json({ status: 'success', data: ticket });
});

export const updateTicketStatus = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const { id } = req.params;
  const { status, note, taskId } = req.body;
  const actorId = req.auth?.sub;

  const ticket = await TicketService.updateTicketStatus(companyId, id, actorId, status, note, taskId);
  res.json({ status: 'success', data: ticket });
});

export const addComment = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const { id } = req.params;
  const authorId = req.auth?.sub;

  const ticket = await TicketService.addTicketComment(companyId, id, authorId, req.body);
  res.json({ status: 'success', data: ticket });
});

export const assignTicket = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const { id } = req.params;
  const actorId = req.auth?.sub;
  const { assigneeId } = req.body;

  const ticket = await TicketService.assignTicket(companyId, id, actorId, assigneeId);
  res.json({ status: 'success', data: ticket });
});
