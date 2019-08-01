import qs from 'qs';
import { GithubOAuthClient } from '.';
import { AUTHORIZE_APP_URL, SCOPES } from './constants';


describe('Github OAuth Client', () => {
  let githubOAuthClient: GithubOAuthClient;
  let config = {
    clientId: 'some-client-id',
    redirectUrl: 'some-redirect-url',
  };

  beforeAll(() =>{ 
    githubOAuthClient = new GithubOAuthClient(config);
  });

  describe('generateAuthUrl', () => {
    it('works correctly', () => {
      const result = githubOAuthClient.generateAuthUrl();
      const resultHost = result.split('?')[0];
      const resultQueryParams = qs.parse(result.split('?')[1]);

      const expectedHost = `https://${AUTHORIZE_APP_URL}`;
      const expectedQueryParams = {
        client_id: config.clientId,
        redirect_uri: config.redirectUrl,
        scope: SCOPES.join(' '),
      };

      expect(resultHost).toBe(expectedHost);
      expect(resultQueryParams).toEqual(expectedQueryParams);
    });
  });
});
