export function requireIntegrationKey(req, res, next) {
  const expectedKey = String(process.env.HRMS_INTEGRATION_KEY || '').trim();
  if (!expectedKey) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'INTEGRATION_NOT_CONFIGURED',
        message: 'HRMS integration key is not configured.',
      },
    });
  }

  const bearerToken = String(req.headers.authorization || '').startsWith('Bearer ')
    ? String(req.headers.authorization).slice(7).trim()
    : '';
  const headerKey = String(req.headers['x-integration-key'] || '').trim();
  const providedKey = bearerToken || headerKey;

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED_INTEGRATION',
        message: 'Invalid integration credentials.',
      },
    });
  }

  return next();
}
