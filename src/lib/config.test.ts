import { ConfigError, getAppConfig, parseAppConfig, resetAppConfigCache } from './config';

const valid = {
  oidcAuthority: 'http://localhost:8080/realms/acme-bank',
  oidcClientId: 'dispute-portal-web',
  apiBaseUrl: '',
};

describe('parseAppConfig', () => {
  it('accepts a valid configuration', () => {
    expect(parseAppConfig(valid)).toEqual(valid);
  });

  it('strips trailing slashes so URLs can be joined safely', () => {
    const config = parseAppConfig({
      ...valid,
      oidcAuthority: 'https://id.example.test/realms/acme-bank/',
      apiBaseUrl: 'https://api.example.test/',
    });

    expect(config.oidcAuthority).toBe('https://id.example.test/realms/acme-bank');
    expect(config.apiBaseUrl).toBe('https://api.example.test');
  });

  it('defaults apiBaseUrl to same origin', () => {
    expect(
      parseAppConfig({ oidcAuthority: valid.oidcAuthority, oidcClientId: 'x' }).apiBaseUrl,
    ).toBe('');
  });

  it('fails clearly when config.js did not load', () => {
    expect(() => parseAppConfig(undefined)).toThrow(ConfigError);
    expect(() => parseAppConfig(undefined)).toThrow(/config\.js did not load/);
  });

  it.each([
    ['a missing authority', { ...valid, oidcAuthority: undefined }, /oidcAuthority/],
    ['a non-URL authority', { ...valid, oidcAuthority: 'not a url' }, /oidcAuthority/],
    ['a non-http authority', { ...valid, oidcAuthority: 'ftp://id.example.test' }, /oidcAuthority/],
    ['an empty client id', { ...valid, oidcClientId: ' ' }, /oidcClientId/],
    ['a relative API base URL', { ...valid, apiBaseUrl: 'api' }, /apiBaseUrl/],
  ])('rejects %s', (_name, raw, message) => {
    expect(() => parseAppConfig(raw)).toThrow(message);
  });
});

describe('getAppConfig', () => {
  afterEach(() => {
    delete window.__APP_CONFIG__;
    resetAppConfigCache();
  });

  it('reads window.__APP_CONFIG__ once and caches it', () => {
    window.__APP_CONFIG__ = valid;
    const first = getAppConfig();
    window.__APP_CONFIG__ = { ...valid, oidcClientId: 'changed' };

    expect(getAppConfig()).toBe(first);
    expect(first.oidcClientId).toBe('dispute-portal-web');
  });

  it('throws when the configuration is absent', () => {
    expect(() => getAppConfig()).toThrow(ConfigError);
  });
});
