import HTTPStatus from "http-status";
import nock from "nock";
import qs from "qs";

import { GithubOAuthClient } from ".";
import {
  AUTHORIZE_APP_URL,
  GITHUB_ACCESS_TOKEN_PATH,
  GITHUB_API_HOST,
  GITHUB_HOST,
  GITHUB_USER_EMAILS_PATH,
  GITHUB_USER_PATH,
  SCOPES
} from "./constants";

describe("Github OAuth Client", () => {
  let githubOAuthClient: GithubOAuthClient;
  const config = {
    clientId: "some-client-id",
    clientSecret: "some-client-secret",
    redirectUrl: "some-redirect-url"
  };

  enum Email {
    Public = "public@email.com",
    Private = "private@email.com"
  }

  enum Code {
    WithEmail = "withEmail",
    WithoutEmail = "withoutEmail"
  }

  enum AccessToken {
    WithEmail = "withEmail",
    WithoutEmail = "withoutEmail"
  }

  const USER_PROFILE_ID = 12345;
  const USER_NAME = "Some Name";

  beforeAll(() => {
    nock(GITHUB_HOST)
      .persist()
      .post(
        GITHUB_ACCESS_TOKEN_PATH,
        (body: { [key: string]: string }) => body.code
      )
      .reply(function(_, requestBody) {
        const { code } = JSON.parse(requestBody.toString());
        const accessToken =
          code === Code.WithEmail
            ? AccessToken.WithEmail
            : AccessToken.WithoutEmail;

        return [HTTPStatus.OK, { access_token: accessToken }];
      });

    nock(GITHUB_API_HOST)
      .persist()
      .get(GITHUB_USER_PATH)
      .reply(function() {
        const accessToken = this.req.headers.authorization.split(" ")[1];
        console.log(accessToken);
        const email =
          accessToken === AccessToken.WithEmail ? Email.Public : null;

        return [
          HTTPStatus.OK,
          {
            id: USER_PROFILE_ID,
            name: USER_NAME,
            email
          }
        ];
      });

    nock(GITHUB_API_HOST)
      .persist()
      .get(GITHUB_USER_EMAILS_PATH)
      .reply(HTTPStatus.OK, [
        {
          email: "tnk2006@rambler.ru",
          primary: false,
          verified: false,
          visibility: null
        },
        {
          email: "info-kopilka@rambler.ru",
          primary: false,
          verified: true,
          visibility: null
        },
        {
          email: Email.Private,
          primary: true,
          verified: true,
          visibility: "public"
        }
      ]);

    githubOAuthClient = new GithubOAuthClient(config);
  });

  describe("generateAuthUrl", () => {
    it("works correctly", () => {
      const result = githubOAuthClient.generateAuthUrl();
      const resultHost = result.split("?")[0];
      const resultQueryParams = qs.parse(result.split("?")[1]);

      const expectedHost = AUTHORIZE_APP_URL;
      const expectedQueryParams = {
        client_id: config.clientId,
        redirect_uri: config.redirectUrl,
        scope: SCOPES.join(" ")
      };

      expect(resultHost).toBe(expectedHost);
      expect(resultQueryParams).toEqual(expectedQueryParams);
    });
  });

  describe("signIn", () => {
    describe("when userData contains publicly available email", () => {
      it("works correctly", async () => {
        const data = await githubOAuthClient.signIn(Code.WithEmail);

        expect(data).toEqual({
          email: Email.Public,
          profileId: USER_PROFILE_ID,
          name: USER_NAME
        });
      });
    });

    describe("when userData does not contain publicly available email", () => {
      it("works correctly", async () => {
        const data = await githubOAuthClient.signIn(Code.WithoutEmail);

        expect(data).toEqual({
          email: Email.Private,
          profileId: USER_PROFILE_ID,
          name: USER_NAME
        });
      });
    });
  });
});
