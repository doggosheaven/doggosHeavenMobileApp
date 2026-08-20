/**
 * Registry of module-level screen caches that must not survive a logout.
 *
 * Several screens keep their last response in module scope so re-focusing is instant.
 * Those variables outlive the session, so without this the next person to sign in on
 * the same app instance sees the previous user's data. Each such screen registers a
 * resetter here, and `clearAuth()` runs them all.
 */

const resetters = new Set();

export const registerCacheReset = (fn) => {
  resetters.add(fn);
  return () => resetters.delete(fn);
};

export const clearSessionCaches = () => {
  resetters.forEach((fn) => {
    try { fn(); } catch {}
  });
};
