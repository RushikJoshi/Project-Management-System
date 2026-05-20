import * as ClientDashboardService from '../services/clientDashboard.service.js';

export async function getStats(req, res, next) {
  try {
    const { companyId, clientId } = req.auth;
    if (!clientId) {
      return res.status(400).json({ success: false, error: { message: 'Client ID is missing in token' } });
    }
    const stats = await ClientDashboardService.getStats({ companyId, clientId });
    return res.status(200).json({ success: true, data: stats });
  } catch (e) {
    return next(e);
  }
}

export async function getProjects(req, res, next) {
  try {
    const { companyId, clientId } = req.auth;
    if (!clientId) {
      return res.status(400).json({ success: false, error: { message: 'Client ID is missing in token' } });
    }
    const projects = await ClientDashboardService.getProjects({ companyId, clientId });
    return res.status(200).json({ success: true, data: projects });
  } catch (e) {
    return next(e);
  }
}

export async function getActivity(req, res, next) {
  try {
    const { companyId, clientId } = req.auth;
    if (!clientId) {
      return res.status(400).json({ success: false, error: { message: 'Client ID is missing in token' } });
    }
    const activity = await ClientDashboardService.getActivity({ companyId, clientId });
    return res.status(200).json({ success: true, data: activity });
  } catch (e) {
    return next(e);
  }
}
