
import request from 'supertest';
import express from 'express';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createApp } from '../../src/api/index';

const mock = new MockAdapter(axios);
const app = createApp();

describe('OAuth2 Authentication', () => {
  const DISCORD_API_URL = 'https://discord.com/api/v8';
  const DISCORD_CLIENT_ID = 'mockClientId';
  const DISCORD_CLIENT_SECRET = 'mockClientSecret';
  const DISCORD_REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';

  beforeAll(() => {
    process.env.DISCORD_CLIENT_ID = DISCORD_CLIENT_ID;
    process.env.DISCORD_CLIENT_SECRET = DISCORD_CLIENT_SECRET;
    process.env.DISCORD_REDIRECT_URI = DISCORD_REDIRECT_URI;
  });

  afterEach(() => {
    mock.reset();
  });

  it('should redirect to Discord authorization URL', async () => {
    const response = await request(app).get('/auth/discord');
    expect(response.status).toBe(302);
    expect(response.header.location).toBe(
      `${DISCORD_API_URL}/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${DISCORD_REDIRECT_URI}&response_type=code&scope=identify`
    );
  });

  it('should handle Discord OAuth2 callback and set session user', async () => {
    const code = 'mockCode';
    const tokenResponse = {
      access_token: 'mockAccessToken',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mockRefreshToken',
      scope: 'identify',
    };
    const userResponse = {
      id: '123456789012345678',
      username: 'testuser',
      discriminator: '1234',
      avatar: 'avatarhash',
    };

    mock.onPost(`${DISCORD_API_URL}/oauth2/token`).reply(200, tokenResponse);
    mock.onGet(`${DISCORD_API_URL}/users/@me`).reply(200, userResponse);
    mock.onGet(`/`).reply(200, "");

    const response = await request(app).get(`/auth/discord/callback?code=${code}`);
    expect(response.status).toBe(302);
    expect(response.header.location).toBe('/');
  });

  it('should return 500 if authentication fails', async () => {
    const code = 'mockCode';
    mock.onPost(`${DISCORD_API_URL}/oauth2/token`).reply(500);

    const response = await request(app).get(`/auth/discord/callback?code=${code}`);
    expect(response.status).toBe(500);
    expect(response.text).toBe('Authentication failed');
  });
});