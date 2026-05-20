import * as HrmsIntegrationService from '../services/hrmsIntegration.service.js';

export async function getDashboard(req, res, next) {
  try {
    const { email, includeCompleted, limit } = req.body;
    const payload = await HrmsIntegrationService.getHrmsDashboardByEmail({
      email,
      includeCompleted,
      limit,
    });
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return next(error);
  }
}
