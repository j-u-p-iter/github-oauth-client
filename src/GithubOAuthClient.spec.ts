import HTTPStatus from "http-status";
import nock from "nock";
import qs from "qs";

import { GithubOAuthClient } from ".";
import { AUTHORIZE_APP_URL, SCOPES } from "./constants";

describe("Github OAuth Client", () => {
  let githubOAuthClient: GithubOAuthClient;
  const config = {
    clientId: "some-client-id",
    clientSecret: "some-client-secret",
    redirectUrl: "some-redirect-url"
  };
  const CODE_WITH_EMAIL = "codeWithEmail";
  const CODE_WITHOUT_EMAIL = "codeWithoutEmail";

  const ACCESS_TOKEN_WITH_EMAIL = "accessTokenWithEmail";
  const ACCESS_TOKEN_WITHOUT_EMAIL = "accessTokenWithoutEmail";

  const PUBLICLY_AVAILABLE_EMAIL = "publicly.available@email.com";
  const PRIVATE_PRIMARY_EMAIL = "j.prototype.unit@gmail.com";

  const USER_PROFILE_ID = 12345;
  const USER_NAME = "Some Name";

  beforeAll(() => {
    nock("https://github.com")
      .persist()
      .post(
        "/login/oauth/access_token",
        (body: { [key: string]: string }) => body.code
      )
      .reply(function(_, requestBody) {
        const { code } = JSON.parse(requestBody.toString());
        const accessToken =
          code === CODE_WITH_EMAIL
            ? ACCESS_TOKEN_WITH_EMAIL
            : ACCESS_TOKEN_WITHOUT_EMAIL;

        return [HTTPStatus.OK, { access_token: accessToken }];
      });

    nock("https://api.github.com")
      .persist()
      .get("/user")
      .reply(function() {
        const accessToken = this.req.headers.authorization.split(" ")[1];
        console.log(accessToken);
        const email =
          accessToken === ACCESS_TOKEN_WITH_EMAIL
            ? PUBLICLY_AVAILABLE_EMAIL
            : null;

        return [
          HTTPStatus.OK,
          {
            id: USER_PROFILE_ID,
            name: USER_NAME,
            email
          }
        ];
      });

    nock("https://api.github.com")
      .persist()
      .get("/user/emails")
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
          email: PRIVATE_PRIMARY_EMAIL,
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
        const data = await githubOAuthClient.signIn(CODE_WITH_EMAIL);

        expect(data).toEqual({
          email: PUBLICLY_AVAILABLE_EMAIL,
          profileId: USER_PROFILE_ID,
          name: USER_NAME
        });
      });
    });

    describe("when userData does not contain publicly available email", () => {
      it("works correctly", async () => {
        const data = await githubOAuthClient.signIn(CODE_WITHOUT_EMAIL);

        expect(data).toEqual({
          email: PRIVATE_PRIMARY_EMAIL,
          profileId: USER_PROFILE_ID,
          name: USER_NAME
        });
      });
    });
  });
});
