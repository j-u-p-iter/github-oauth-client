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
          code === "with email" ? "tokenWithEmail" : "tokenWithoutEmail";

        return [200, { access_token: accessToken }];
      });

    nock("https://api.github.com")
      .persist()
      .get("/user")
      .reply(function() {
        const accessToken = this.req.headers.authorization.split(" ")[1];
        console.log(accessToken);
        const email =
          accessToken === "tokenWithEmail" ? "some@email.com" : null;

        return [
          200,
          {
            id: 12345,
            name: "Some Name",
            email
          }
        ];
      });

    nock("https://api.github.com")
      .persist()
      .get("/user/emails")
      .reply(200, [
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
          email: "j.prototype.unit@gmail.com",
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

      const expectedHost = `https://${AUTHORIZE_APP_URL}`;
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
        const data = await githubOAuthClient.signIn("with email");

        expect(data).toEqual({
          email: "some@email.com",
          profileId: 12345,
          name: "Some Name"
        });
      });
    });

    describe("when userData does not contain publicly available email", () => {
      it("works correctly", async () => {
        const data = await githubOAuthClient.signIn("withoutEmail");

        expect(data).toEqual({
          email: "j.prototype.unit@gmail.com",
          profileId: 12345,
          name: "Some Name"
        });
      });
    });
  });
});
