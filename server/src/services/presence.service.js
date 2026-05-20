/**
 * Lightweight in-memory presence tracking.
 * A user is "online" if they sent a heartbeat within the last ONLINE_TTL_MS.
 * No database writes — purely ephemeral.
 */

const ONLINE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/** Map of userId -> lastSeenAt (Date) */
const presenceMap = new Map();

export function heartbeat(userId) {
  if (userId) presenceMap.set(String(userId), new Date());
}

export function isOnline(userId) {
  const last = presenceMap.get(String(userId));
  if (!last) return false;
  return Date.now() - last.getTime() < ONLINE_TTL_MS;
}

export function getOnlineUserIds() {
  const now = Date.now();
  const online = [];
  for (const [userId, lastSeen] of presenceMap.entries()) {
    if (now - lastSeen.getTime() < ONLINE_TTL_MS) {
      online.push(userId);
    }
  }
  return online;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, lastSeen] of presenceMap.entries()) {
    if (now - lastSeen.getTime() > ONLINE_TTL_MS * 2) {
      presenceMap.delete(userId);
    }
  }
}, 5 * 60 * 1000);
