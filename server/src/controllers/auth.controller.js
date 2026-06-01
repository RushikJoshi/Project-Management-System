import * as AuthService from '../services/auth.service.js';
import * as LoginActivityService from '../services/loginActivity.service.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { sha256 } from '../utils/crypto.js';

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
  const { email, companyCode, employeeCode, password } = req.body;
  try {
    const result = await AuthService.login({ email, companyCode, employeeCode, password });

    // Log successful login activity
    const decoded = verifyAccessToken(result.accessToken);
    const sessionId = sha256(result.refreshToken);
    await LoginActivityService.logSuccess({
      req,
      user: result.user,
      tenantId: decoded.companyId,
      workspaceId: decoded.workspaceId,
      sessionId,
      tokenId: sessionId,
      loginType: 'Email Password',
    });

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
    // Log failed login activity
    await LoginActivityService.logFailure({
      req,
      email,
      companyCode,
      employeeCode,
      failureReason: e.message || 'Invalid credentials',
    });
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
    if (refreshToken) {
      await LoginActivityService.logLogout({ refreshToken });
    }
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

    // Log successful login activity for the registering client
    const decoded = verifyAccessToken(result.accessToken);
    const sessionId = sha256(result.refreshToken);
    await LoginActivityService.logSuccess({
      req,
      user: result.user,
      tenantId: decoded.companyId,
      workspaceId: decoded.workspaceId,
      sessionId,
      tokenId: sessionId,
      loginType: 'Email Password',
    });

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
