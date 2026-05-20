import * as ClientService from '../services/client.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const createClient = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  console.log('[ClientCtrl] createClient — companyId:', companyId, '| body:', JSON.stringify(req.body));

  if (!companyId) {
    return res.status(400).json({ status: 'error', message: 'Unable to identify your workspace. Please re-login.' });
  }

  try {
    const client = await ClientService.createClient({ companyId, clientData: req.body });
    res.status(201).json({ status: 'success', data: client });
  } catch (err) {
    console.error('[ClientCtrl] createClient error:', err.message, '| code:', err.code, '| keyValue:', JSON.stringify(err.keyValue));
    // Duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || 'field';
      return res.status(409).json({ status: 'error', message: `A client with this ${field} already exists.` });
    }
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({ status: 'error', message: `Validation failed: ${messages}` });
    }
    throw err; // Let global error handler deal with other errors
  }
});

export const listClients = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const clients = await ClientService.listClients({ companyId });
  res.json({ status: 'success', data: clients });
});

export const getClient = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const client = await ClientService.getClient({ 
    companyId, 
    clientId: req.params.id 
  });
  if (!client) return res.status(404).json({ status: 'error', message: 'Client not found' });
  res.json({ status: 'success', data: client });
});

export const updateClient = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const client = await ClientService.updateClient({ 
    companyId, 
    clientId: req.params.id, 
    updates: req.body 
  });
  res.json({ status: 'success', data: client });
});

export const inviteClientUser = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const actorId = req.auth?.sub;
  const credentials = await ClientService.inviteClientUser({
    companyId, 
    actorId,
    clientId: req.params.id, 
    invitationData: {
      email: req.body.email,
      role: req.body.role,
      name: req.body.name,
      password: req.body.password,
      projectIds: req.body.projectIds || [],
    }
  });
  res.status(201).json({ status: 'success', data: credentials });
});

export const assignProjects = catchAsync(async (req, res) => {
  const companyId = req.auth?.companyId;
  const { projectIds } = req.body;
  const client = await ClientService.assignProjectsToClient({ 
    companyId, 
    clientId: req.params.id, 
    projectIds 
  });
  res.json({ status: 'success', data: client });
});
