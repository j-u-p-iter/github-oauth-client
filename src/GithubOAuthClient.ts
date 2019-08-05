import { makeUrl } from "@j.u.p.iter/node-utils";
import axios from "axios";

import {
  ACCESS_TOKEN_URL,
  AUTHORIZE_APP_URL,
  SCOPES,
  USER_EMAILS_URL,
  USER_URL
} from "./constants";

interface Config {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}

interface OAuthClient {
  generateAuthUrl: () => string;
  signIn: (code: string) => Promise<{ email: string; name: string }>;
}

export class GithubOAuthClient implements OAuthClient {
  constructor(private config: Config) {}

  private prepareData(userData: any, emails: any) {
    const { id: profileId, name, email: emailFromUserData } = userData;
    const email = emailFromUserData
      ? emailFromUserData
      : emails.find(({ primary }: any) => primary).email;

    return { profileId, name, email };
  }

  private async getAccessToken(code: string): Promise<any> {
    const params = {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    };

    const {
      data: { access_token: accessToken }
    } = await axios.post(ACCESS_TOKEN_URL, params);

    return accessToken;
  }

  private async getUserData(accessToken: string): Promise<any> {
    const { data: userData } = await axios.get(USER_URL, {
      headers: { Authorization: `token ${accessToken}` }
    });

    return userData;
  }

  private async getUserEmails(accessToken: string): Promise<any> {
    const { data: emails } = await axios.get(USER_EMAILS_URL, {
      headers: { Authorization: `token ${accessToken}` }
    });

    return emails;
  }

  public generateAuthUrl(): string {
    const authUrl = makeUrl({
      port: null,
      protocol: "https",
      host: AUTHORIZE_APP_URL,
      queryObject: {
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUrl,
        scope: SCOPES.join(" ")
      }
    });

    return authUrl;
  }

  public async signIn(code: string): Promise<any> {
    const accessToken = await this.getAccessToken(code);

    const userData = await this.getUserData(accessToken);

    let emails;

    if (!userData.email) {
      emails = await this.getUserEmails(accessToken);
    }

    return this.prepareData(userData, emails);
  }
}
