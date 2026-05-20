import {
  listDailyWorkspaceReports,
  buildDailyWorkspaceReport,
  runWorkspaceAutomation,
} from '../services/reportAutomation.service.js';
import { getReportWeekly, getReportEmployee, getReportProject } from './mis.controller.js';

export { getReportWeekly, getReportEmployee, getReportProject };

export async function getDailyReports(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const reports = await listDailyWorkspaceReports({
      companyId,
      workspaceId,
      limit: req.query.limit,
    });
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    return next(error);
  }
}

export async function getDailyLatest(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const report = await buildDailyWorkspaceReport({
      companyId,
      workspaceId,
      reportDate: new Date(),
      persist: true,
    });
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    return next(error);
  }
}

export async function triggerDailyRun(req, res, next) {
  try {
    const { companyId, workspaceId } = req.auth;
    const result = await runWorkspaceAutomation({
      companyId,
      workspaceId,
      date: new Date(),
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}
