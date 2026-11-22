// Runtime configuration for local development (vite dev / vite preview).
// In the Docker image nginx answers /config.js itself, built from environment variables.
window.__APP_CONFIG__ = {
  oidcAuthority: 'http://localhost:8080/realms/acme-bank',
  oidcClientId: 'dispute-portal-web',
  apiBaseUrl: '',
};
