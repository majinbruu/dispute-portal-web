import { buildOidcSettings } from './userManager';

const config = {
  oidcAuthority: 'http://localhost:8080/realms/acme-bank',
  oidcClientId: 'dispute-portal-web',
  apiBaseUrl: '',
};

describe('buildOidcSettings', () => {
  const settings = buildOidcSettings(config, 'http://localhost:3000');

  it('uses the authorization code flow for a public client', () => {
    expect(settings.authority).toBe('http://localhost:8080/realms/acme-bank');
    expect(settings.client_id).toBe('dispute-portal-web');
    expect(settings.response_type).toBe('code');
    expect(settings.client_secret).toBeUndefined();
    expect(settings.scope).toBe('openid profile');
  });

  it('redirects back to the app origin', () => {
    expect(settings.redirect_uri).toBe('http://localhost:3000/');
    expect(settings.post_logout_redirect_uri).toBe('http://localhost:3000/');
  });

  it('keeps tokens in memory and renews them silently', async () => {
    expect(settings.automaticSilentRenew).toBe(true);

    await settings.userStore!.set('user:probe', 'token');

    expect(await settings.userStore!.get('user:probe')).toBe('token');
    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage).toHaveLength(0);
  });
});
