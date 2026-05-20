import * as ClientTeamsService from '../services/clientTeams.service.js';

export async function getSummary(req, res, next) {
  try {
    const { companyId, clientId } = req.auth;
    
    if (!clientId) {
      return res.status(400).json({ success: false, error: { message: 'Client ID is missing in token' } });
    }

    const summary = await ClientTeamsService.getTeamsSummary({ companyId, clientId });
    return res.status(200).json({ success: true, data: summary });
  } catch (e) {
    return next(e);
  }
}

export async function getList(req, res, next) {
  try {
    const { companyId, clientId } = req.auth;

    if (!clientId) {
      return res.status(400).json({ success: false, error: { message: 'Client ID is missing in token' } });
    }

    const list = await ClientTeamsService.getTeamsList({ companyId, clientId });
    return res.status(200).json({ success: true, data: list });
  } catch (e) {
    return next(e);
  }
}

export async function getDetails(req, res, next) {
  try {
    const { companyId, clientId } = req.auth;
    const { id: teamId } = req.params;

    if (!clientId) {
      return res.status(400).json({ success: false, error: { message: 'Client ID is missing in token' } });
    }

    const details = await ClientTeamsService.getTeamDetails({ companyId, clientId, teamId });
    if (!details) {
      return res.status(404).json({ success: false, error: { message: 'Team not found or not accessible' } });
    }

    return res.status(200).json({ success: true, data: details });
  } catch (e) {
    return next(e);
  }
}
