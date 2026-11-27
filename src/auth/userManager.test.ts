import { oidcUser } from '../test/oidcUser';
import { buildOidcSettings, endLocalSession, getAccessToken, getUserManager } from './userManager';

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

describe('the shared session', () => {
  beforeAll(() => {
    window.__APP_CONFIG__ = config;
  });

  afterEach(async () => {
    await endLocalSession();
  });

  afterAll(() => {
    delete window.__APP_CONFIG__;
  });

  it('has no access token while signed out', async () => {
    expect(await getAccessToken()).toBeUndefined();
  });

  it('hands out the access token of the signed-in customer', async () => {
    const user = oidcUser();
    await getUserManager().storeUser(user);

    expect(await getAccessToken()).toBe(user.access_token);
  });

  it('withholds an expired access token', async () => {
    await getUserManager().storeUser(oidcUser({ expiresIn: -60 }));

    expect(await getAccessToken()).toBeUndefined();
  });

  it('forgets the customer when the local session ends', async () => {
    await getUserManager().storeUser(oidcUser());

    await endLocalSession();

    expect(await getUserManager().getUser()).toBeNull();
    expect(await getAccessToken()).toBeUndefined();
  });
});
