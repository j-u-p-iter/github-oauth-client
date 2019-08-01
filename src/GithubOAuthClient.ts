import axios from 'axios';
import { makeUrl } from '@j.u.p.iter/node-utils';


import {
  ACCESS_TOKEN_URL,
  AUTHORIZE_APP_URL,
  USER_URL,
  SCOPES,
} from './constants';

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

  private prepareData(data: any) {
    return data;
  }

  private async getAccessToken(code: string): Promise<any> {
    const params = {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    };
    
    const { data: { access_token: accessToken } } = await axios.post(ACCESS_TOKEN_URL, params); 

    return accessToken; 
  }

  private async getUserData(accessToken: string): Promise<any> {
    const { data: { user } } = await axios.get(USER_URL, {
      headers: { Authorization: `token ${accessToken}` },
    });

    return user;
  }

  public generateAuthUrl(): string {
    const authUrl = makeUrl({
      port: null,
      protocol: 'https',
      host: AUTHORIZE_APP_URL,
      queryObject: {
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUrl,
        scope: SCOPES.join(' '),
      },
    })

    return authUrl;
  }

  public async signIn(code: string): Promise<any> {
    const accessToken = await this.getAccessToken(code);
    const userData = await this.getUserData(accessToken);

    return this.prepareData(userData);
  }
}
