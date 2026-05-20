import * as TaskService from '../services/task.service.js';

export async function getStats(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId, role } = req.auth;
    const stats = await TaskService.getTaskStatisticsUnified({ companyId, workspaceId, userId, role });
    return res.status(200).json({ success: true, data: stats });
  } catch (e) {
    next(e);
  }
}

export async function getUnifiedList(req, res, next) {
  try {
    const { companyId, workspaceId, sub: userId, role } = req.auth;
    const { 
      type = 'project', 
      filter = 'all', 
      page = 1, 
      limit = 50,
      searchTerm = '',
      department = '',
      personId = ''
    } = req.query;

    const result = await TaskService.listTasksUnified({
      companyId,
      workspaceId,
      userId,
      role,
      type,
      filter,
      page: Number(page),
      limit: Number(limit),
      searchTerm,
      department,
      personId
    });

    return res.status(200).json({ 
      success: true, 
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        counts: result.counts // Return counts relevant to the current list
      }
    });
  } catch (e) {
    next(e);
  }
}
