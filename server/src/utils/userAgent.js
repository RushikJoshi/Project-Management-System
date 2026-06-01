export function parseUserAgent(ua = '') {
  let browser = 'Other';
  let operatingSystem = 'Other';
  let deviceType = 'Desktop';

  const uaLower = ua.toLowerCase();

  // 1. Device Type
  if (uaLower.includes('ipad') || uaLower.includes('tablet') || (uaLower.includes('android') && !uaLower.includes('mobile'))) {
    deviceType = 'Tablet';
  } else if (uaLower.includes('mobile') || uaLower.includes('iphone') || uaLower.includes('ipod') || uaLower.includes('android')) {
    deviceType = 'Mobile';
  } else {
    deviceType = 'Desktop';
  }

  // 2. Operating System
  if (uaLower.includes('windows')) {
    operatingSystem = 'Windows';
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    operatingSystem = 'macOS';
  } else if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
    operatingSystem = 'iOS';
  } else if (uaLower.includes('android')) {
    operatingSystem = 'Android';
  } else if (uaLower.includes('linux')) {
    operatingSystem = 'Linux';
  }

  // 3. Browser
  if (uaLower.includes('edg/')) {
    browser = 'Edge';
  } else if (uaLower.includes('chrome/') || uaLower.includes('crios/')) {
    // Check Chrome before Safari because Safari is in Chrome's UA
    browser = 'Chrome';
  } else if (uaLower.includes('firefox/') || uaLower.includes('fxios/')) {
    browser = 'Firefox';
  } else if (uaLower.includes('safari/') && !uaLower.includes('chrome') && !uaLower.includes('chromium')) {
    browser = 'Safari';
  } else if (uaLower.includes('opr/') || uaLower.includes('opera/')) {
    browser = 'Opera';
  } else if (uaLower.includes('msie') || uaLower.includes('trident/')) {
    browser = 'Internet Explorer';
  }

  return { browser, operatingSystem, deviceType };
}

export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

export function getLocationFromIp(ip = '') {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'Localhost (IN)';
  }
  // Simulated geolocation mapping for testing/demo
  const sampleLocations = [
    'Mumbai, India (IN)',
    'Delhi, India (IN)',
    'Bengaluru, India (IN)',
    'San Francisco, USA (US)',
    'New York, USA (US)',
    'London, UK (GB)',
    'Singapore (SG)',
  ];
  // Stable hash based on IP address value
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash += ip.charCodeAt(i);
  }
  return sampleLocations[hash % sampleLocations.length];
}
