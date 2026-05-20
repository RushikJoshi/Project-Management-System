import * as AuthService from '../services/auth.service.js';

export async function register(req, res, next) {
  try {
    const { name, email, password, workspace } = req.body;
    const result = await AuthService.register({ name, email, password, workspaceName: workspace });

    return res.status(201).json({
      success: true,
      data: {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (e) {
    return next(e);
  }
}

export async function login(req, res, next) {
  try {
    const { email, companyCode, employeeCode, password } = req.body;
    const result = await AuthService.login({ email, companyCode, employeeCode, password });

    // Existing response shape is preserved — no breaking change for current frontend
    return res.status(200).json({
      success: true,
      data: {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (e) {
    return next(e);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh({
      refreshToken,
      userAgent: req.headers['user-agent'] || null,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      data: {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (e) {
    return next(e);
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body ?? {};
    await AuthService.logout({ refreshToken });

    return res.status(200).json({ success: true, data: { ok: true } });
  } catch (e) {
    return next(e);
  }
}

export async function verifyClientInvite(req, res, next) {
  try {
    const { tenantId, token } = req.params;
    const result = await AuthService.verifyInviteToken({ tenantId, token });
    return res.json({ success: true, data: result });
  } catch (e) {
    return next(e);
  }
}

export async function registerClientUser(req, res, next) {
  try {
    const { tenantId, token } = req.params;
    const { password, name } = req.body;
    const result = await AuthService.acceptInviteAndRegister({ tenantId, token, password, name });
    return res.status(201).json({
      success: true,
      data: {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        workSession: result.workSession,
      },
    });
  } catch (e) {
    return next(e);
  }
}
