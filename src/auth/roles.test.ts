import { accessToken } from '../test/oidcUser';
import { portalRole, rolesFromAccessToken } from './roles';

describe('rolesFromAccessToken', () => {
  it('reads the roles claim of the token', () => {
    expect(rolesFromAccessToken(accessToken({ sub: 'u-1', roles: ['customer'] }))).toEqual([
      'customer',
    ]);
  });

  it('reads a payload that needs base64url and UTF-8 decoding', () => {
    // The name makes the encoded payload contain `-` and `_`, which plain base64 does not use.
    const token = accessToken({ name: 'Zoë ÿ>?~', roles: ['agent'] });

    expect(token.split('.')[1]).toMatch(/[-_]/);
    expect(rolesFromAccessToken(token)).toEqual(['agent']);
  });

  it('ignores entries that are not strings', () => {
    expect(rolesFromAccessToken(accessToken({ roles: ['agent', 7, null] }))).toEqual(['agent']);
  });

  it.each([
    ['no token', undefined],
    ['an empty token', ''],
    ['a token that is not a JWT', 'opaque-token'],
    ['a payload that is not JSON', 'aaa.%%%.ccc'],
    ['a payload that is not an object', `x.${btoa('"roles"')}.y`],
    ['no roles claim', accessToken({ sub: 'u-1' })],
    ['a roles claim that is not a list', accessToken({ roles: 'agent' })],
  ])('gives no roles for %s', (_case, token) => {
    expect(rolesFromAccessToken(token)).toEqual([]);
  });
});

describe('portalRole', () => {
  it.each([
    [['customer'], 'customer'],
    [['agent'], 'agent'],
    [['agent', 'customer'], 'agent'],
    [['default-roles-acme-bank'], undefined],
    [[], undefined],
  ])('treats a user with the roles %j as %s', (roles, role) => {
    expect(portalRole(roles)).toBe(role);
  });
});
