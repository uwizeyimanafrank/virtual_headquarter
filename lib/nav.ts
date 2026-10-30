/**
 * Full page navigation (not a client-side route change). Used on purpose after login, lock and panic
 * so every bit of in-memory state is thrown away and the server re-checks the session.
 */
export function hardNavigate(url: string) {
  window.location.replace(url);
}
