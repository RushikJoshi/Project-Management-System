import * as TimelineService from '../services/timeline.service.js';

export const getTimeline = async (req, res, next) => {
  try {
    const auth = req.user || req.auth;
    const companyId = auth.companyId;
    const workspaceId = auth.workspaceId;
    const userId = auth.sub || auth.id;
    const { projectId } = req.params;

    const timeline = await TimelineService.getProjectTimeline({ companyId, workspaceId, projectId, userId });
    return res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    return next(error);
  }
};

export const upsertTimeline = async (req, res, next) => {
  try {
    const auth = req.user || req.auth;
    const companyId = auth.companyId;
    const workspaceId = auth.workspaceId;
    const userId = auth.sub || auth.id;
    const role = auth.role;
    const { projectId } = req.params;

    const timeline = await TimelineService.upsertProjectTimeline({
      companyId,
      workspaceId,
      projectId,
      userId,
      role,
      data: req.body,
    });

    return res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    return next(error);
  }
};

export const patchTaskTimeline = async (req, res, next) => {
  try {
    const auth = req.user || req.auth;
    const companyId = auth.companyId;
    const workspaceId = auth.workspaceId;
    const userId = auth.sub || auth.id;
    const role = auth.role;
    const { id } = req.params;
    const { projectId } = req.body;

    const timeline = await TimelineService.updateTaskTimeline({
      companyId,
      workspaceId,
      projectId,
      taskId: id,
      updates: req.body,
      userId,
      role,
    });

    return res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    return next(error);
  }
};

export const createDependency = async (req, res, next) => {
  try {
    const auth = req.user || req.auth;
    const companyId = auth.companyId;
    const workspaceId = auth.workspaceId;
    const userId = auth.sub || auth.id;
    const role = auth.role;

    const timeline = await TimelineService.createTaskDependency({
      companyId,
      workspaceId,
      projectId: req.body.projectId,
      fromTaskId: req.body.fromTaskId,
      toTaskId: req.body.toTaskId,
      userId,
      role,
    });

    return res.status(201).json({ success: true, data: timeline });
  } catch (error) {
    return next(error);
  }
};

export const lockTimeline = async (req, res, next) => {
  try {
    const auth = req.user || req.auth;
    const companyId = auth.companyId;
    const workspaceId = auth.workspaceId;
    const userId = auth.sub || auth.id;
    const role = auth.role;
    const { projectId } = req.params;

    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only admins can approve/lock the timeline.' });
    }

    const timeline = await TimelineService.setTimelineLock({
      companyId,
      workspaceId,
      projectId,
      userId,
      locked: true,
    });

    return res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    return next(error);
  }
};

export const unlockTimeline = async (req, res, next) => {
  try {
    const auth = req.user || req.auth;
    const companyId = auth.companyId;
    const workspaceId = auth.workspaceId;
    const userId = auth.sub || auth.id;
    const role = auth.role;
    const { projectId } = req.params;

    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only admins can unlock the timeline.' });
    }

    const timeline = await TimelineService.setTimelineLock({
      companyId,
      workspaceId,
      projectId,
      userId,
      locked: false,
    });

    return res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    return next(error);
  }
};
