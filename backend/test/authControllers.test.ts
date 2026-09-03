import request from 'supertest';
import axios from 'axios';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { describe, afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('axios');
const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};
(axios as any).isAxiosError = (error: any): error is AxiosError =>
  error && error.response !== undefined;

// Shared mock state - hoisted so the vi.mock factories below can use it.
const { verifyIdTokenMock, adminAuth, adminDbRef, sendPasswordResetEmailMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  adminAuth: {
    createUser: vi.fn(),
    createCustomToken: vi.fn(),
    generatePasswordResetLink: vi.fn(),
    verifyIdToken: vi.fn(),
    deleteUser: vi.fn(),
    getUserByEmail: vi.fn(),
    updateUser: vi.fn()
  },
  adminDbRef: { set: vi.fn(), remove: vi.fn() },
  sendPasswordResetEmailMock: vi.fn()
}));

// google-auth-library - capture the verifyIdToken mock
vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock
  }))
}));

// Firebase Admin SDK shim
vi.mock('../src/config/firebase-admin', () => ({
  admin: {
    auth: () => adminAuth,
    database: () => ({ ref: () => adminDbRef })
  }
}));

// Branded password-reset email sender - stubbed so no real mail is sent.
vi.mock('../src/utils/passwordResetEmail', () => ({
  sendPasswordResetEmail: sendPasswordResetEmailMock
}));

import {
  signup,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
  getUser,
  deleteAccount,
  logout,
  refreshExtensionToken
} from '../src/controllers/authControllers';

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.post('/signup', signup);
app.post('/login', login);
app.post('/forgot-password', forgotPassword);
app.post('/reset-password', resetPassword);
app.post('/google', googleAuth);
app.get('/user', getUser);
app.post('/delete-account', deleteAccount);
app.post('/logout', logout);
// refreshExtensionToken normally sits behind verifyToken - fake it here.
app.post(
  '/refresh-extension-token',
  (req: any, _res, next) => {
    req.user = { uid: 'uid-123' };
    next();
  },
  refreshExtensionToken as any
);

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// signup
// ---------------------------------------------------------------------------
describe('POST /signup', () => {
  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/signup').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email and password are required' });
  });

  it('creates the user via the Admin SDK, writes the profile and sets the authToken cookie', async () => {
    adminAuth.createUser.mockResolvedValueOnce({ uid: 'newUid' });
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        idToken: 'id-token',
        email: 'new@example.com',
        refreshToken: 'refresh-token',
        expiresIn: '3600'
      }
    });
    adminDbRef.set.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/signup')
      .send({ email: 'new@example.com', password: 'pass1234', displayName: 'New Person' });

    expect(adminAuth.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'pass1234',
      displayName: 'New Person'
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('accounts:signInWithPassword'),
      expect.objectContaining({ email: 'new@example.com', password: 'pass1234', returnSecureToken: true })
    );
    expect(adminDbRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com', displayName: 'New Person' })
    );
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      idToken: 'id-token',
      email: 'new@example.com',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
      localId: 'newUid',
      displayName: 'New Person'
    });
    expect(res.headers['set-cookie'][0]).toMatch(/^authToken=id-token/);
  });

  it('defaults displayName to the email local-part', async () => {
    adminAuth.createUser.mockResolvedValueOnce({ uid: 'u2' });
    mockedAxios.post.mockResolvedValueOnce({
      data: { idToken: 't', email: 'noname@example.com', refreshToken: 'r', expiresIn: '3600' }
    });
    adminDbRef.set.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/signup')
      .send({ email: 'noname@example.com', password: 'pass1234' });

    expect(adminAuth.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'noname' })
    );
    expect(res.status).toBe(201);
    expect(res.body.displayName).toBe('noname');
  });

  it('returns 201 with a warning when the DB write fails', async () => {
    adminAuth.createUser.mockResolvedValueOnce({ uid: 'u3' });
    mockedAxios.post.mockResolvedValueOnce({
      data: { idToken: 't3', email: 'db@example.com', refreshToken: 'r3', expiresIn: '3600' }
    });
    adminDbRef.set.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/signup')
      .send({ email: 'db@example.com', password: 'pass1234', displayName: 'DB' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      idToken: 't3',
      email: 'db@example.com',
      refreshToken: 'r3',
      expiresIn: '3600',
      localId: 'u3',
      warning: 'User created but profile data not saved'
    });
    expect(res.headers['set-cookie'][0]).toMatch(/^authToken=t3/);
  });

  it('formats an Admin SDK error message', async () => {
    adminAuth.createUser.mockRejectedValueOnce(new Error('The email address is already in use'));

    const res = await request(app)
      .post('/signup')
      .send({ email: 'existing@example.com', password: 'pass1234' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'The email address is already in use' });
  });

  it('propagates an axios error status/message', async () => {
    adminAuth.createUser.mockResolvedValueOnce({ uid: 'u4' });
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 403, data: { error: { message: 'TOKEN_EXPIRED' } } }
    });

    const res = await request(app)
      .post('/signup')
      .send({ email: 'x@example.com', password: 'pass1234' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'TOKEN_EXPIRED' });
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------
describe('POST /login', () => {
  it('returns 400 when credentials are missing', async () => {
    const res = await request(app).post('/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email and password are required' });
  });

  it('returns the auth data and sets the authToken cookie', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        localId: 'lid',
        idToken: 'login-token',
        refreshToken: 'r',
        expiresIn: '3600',
        email: 'a@b.com'
      }
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'a@b.com', password: 'pass1234' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('idToken', 'login-token');
    expect(res.body).not.toHaveProperty('extensionToken');
    expect(res.headers['set-cookie'][0]).toMatch(/^authToken=login-token/);
  });

  it('includes an extensionToken when requestExtensionToken is set', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { localId: 'lid', idToken: 'it', refreshToken: 'r', expiresIn: '3600', email: 'a@b.com' }
    });
    adminAuth.createCustomToken.mockResolvedValueOnce('custom-token');

    const res = await request(app)
      .post('/login')
      .send({ email: 'a@b.com', password: 'pass1234', requestExtensionToken: true });

    expect(adminAuth.createCustomToken).toHaveBeenCalledWith('lid');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ idToken: 'it', localId: 'lid', extensionToken: 'custom-token' });
  });

  it('propagates an axios error status/message', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 400, data: { error: { message: 'INVALID_PASSWORD' } } }
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'a@b.com', password: 'wrong' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'INVALID_PASSWORD' });
  });
});

// ---------------------------------------------------------------------------
// forgotPassword
// ---------------------------------------------------------------------------
describe('POST /forgot-password', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/forgot-password').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Email is required' });
  });

  it('generates a reset link and mails our own app URL carrying the oobCode', async () => {
    adminAuth.generatePasswordResetLink.mockResolvedValueOnce(
      'https://c2n.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=OOB123&apiKey=k'
    );

    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'reset@example.com' });

    expect(adminAuth.generatePasswordResetLink).toHaveBeenCalledWith('reset@example.com');
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      'reset@example.com',
      expect.stringMatching(/\/reset-password\?oobCode=OOB123$/)
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Password reset email sent' });
  });

  it('honours APP_BASE_URL for the reset link host', async () => {
    process.env.APP_BASE_URL = 'https://app.example.com/';
    adminAuth.generatePasswordResetLink.mockResolvedValueOnce(
      'https://c2n.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ZZZ'
    );

    await request(app).post('/forgot-password').send({ email: 'reset@example.com' });

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      'reset@example.com',
      'https://app.example.com/reset-password?oobCode=ZZZ'
    );
    delete process.env.APP_BASE_URL;
  });

  it('returns 200 without mailing when the account does not exist (no enumeration)', async () => {
    adminAuth.generatePasswordResetLink.mockRejectedValueOnce(
      Object.assign(new Error('no user'), { code: 'auth/user-not-found' })
    );

    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'missing@example.com' });

    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Password reset email sent' });
  });

  it('returns 500 when link generation fails unexpectedly', async () => {
    adminAuth.generatePasswordResetLink.mockRejectedValueOnce(new Error('boom'));

    const res = await request(app)
      .post('/forgot-password')
      .send({ email: 'reset@example.com' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to send password reset email' });
  });
});

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
describe('POST /reset-password', () => {
  it('returns 400 when oobCode or newPassword is missing', async () => {
    const res = await request(app).post('/reset-password').send({ oobCode: 'x' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Reset code and new password are required' });
  });

  it('returns 400 when the new password is too short', async () => {
    const res = await request(app)
      .post('/reset-password')
      .send({ oobCode: 'x', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Password must be at least 8 characters long' });
  });

  it('confirms the reset via the Firebase resetPassword endpoint', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { email: 'reset@example.com' } });

    const res = await request(app)
      .post('/reset-password')
      .send({ oobCode: 'OOB123', newPassword: 'newpass1234' });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('accounts:resetPassword'),
      { oobCode: 'OOB123', newPassword: 'newpass1234' }
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Password has been reset' });
  });

  it('maps an expired code to a 400', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { error: { message: 'EXPIRED_OOB_CODE' } } }
    });

    const res = await request(app)
      .post('/reset-password')
      .send({ oobCode: 'stale', newPassword: 'newpass1234' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'EXPIRED_OOB_CODE' });
  });

  it('maps an invalid code to a 400', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { error: { message: 'INVALID_OOB_CODE' } } }
    });

    const res = await request(app)
      .post('/reset-password')
      .send({ oobCode: 'bad', newPassword: 'newpass1234' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'INVALID_OOB_CODE' });
  });
});

// ---------------------------------------------------------------------------
// getUser (GET /auth/user)
// ---------------------------------------------------------------------------
describe('GET /user', () => {
  it('returns 401 when the Authorization header is missing', async () => {
    const res = await request(app).get('/user');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authorization header is required' });
  });

  it('verifies the token via accounts:lookup and returns the user shape', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        users: [
          {
            email: 'john@example.com',
            displayName: 'John Doe',
            photoUrl: 'http://photo/john.png'
          }
        ]
      }
    });

    const res = await request(app).get('/user').set('Authorization', 'Bearer abc123');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('accounts:lookup'),
      { idToken: 'abc123' }
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: 'john@example.com',
      firstName: 'John',
      displayName: 'John Doe',
      photoURL: 'http://photo/john.png'
    });
  });

  it('returns 404 when no user is found', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { users: [] } });

    const res = await request(app).get('/user').set('Authorization', 'Bearer abc123');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('returns 401 when the lookup call fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('bad token'));

    const res = await request(app).get('/user').set('Authorization', 'Bearer abc123');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
  });
});

// ---------------------------------------------------------------------------
// googleAuth
// ---------------------------------------------------------------------------
describe('POST /google', () => {
  it('returns 400 when the Google ID token is missing', async () => {
    const res = await request(app).post('/google').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Google ID token is required' });
  });

  it('returns 401 when both Google verification paths fail', async () => {
    verifyIdTokenMock.mockRejectedValueOnce(new Error('bad google token'));
    mockedAxios.get.mockRejectedValueOnce(new Error('tokeninfo down'));

    const res = await request(app).post('/google').send({ idToken: 'g-token' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'Invalid Google ID token' });
  });

  it('creates a new Firebase user, links the provider and returns tokens', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'g@example.com',
        name: 'G User',
        picture: 'http://photo/g.png',
        email_verified: true,
        sub: 'google-sub'
      })
    });
    adminAuth.getUserByEmail.mockRejectedValueOnce(new Error('not found'));
    adminAuth.createUser.mockResolvedValueOnce({ uid: 'g-uid' });
    adminAuth.updateUser.mockResolvedValueOnce(undefined);
    adminDbRef.set.mockResolvedValueOnce(undefined);
    adminAuth.createCustomToken.mockResolvedValueOnce('g-custom-token');
    mockedAxios.post.mockResolvedValueOnce({ data: { idToken: 'g-firebase-id-token' } });

    const res = await request(app).post('/google').send({ idToken: 'g-token' });

    expect(adminAuth.createUser).toHaveBeenCalled();
    expect(adminAuth.createCustomToken).toHaveBeenCalledWith('g-uid');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('accounts:signInWithIdp'),
      expect.objectContaining({ postBody: expect.stringContaining('providerId=google.com') })
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      idToken: 'g-firebase-id-token',
      customToken: 'g-custom-token',
      email: 'g@example.com',
      photoURL: 'http://photo/g.png'
    });
    expect(res.headers['set-cookie'][0]).toMatch(/^authToken=g-firebase-id-token/);
  });
});

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------
describe('POST /delete-account', () => {
  it('returns 400 when the ID token is missing', async () => {
    const res = await request(app).post('/delete-account').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ID token is required' });
  });

  it('removes the profile and deletes the auth user', async () => {
    adminAuth.verifyIdToken.mockResolvedValueOnce({ uid: 'del-uid' });
    adminDbRef.remove.mockResolvedValueOnce(undefined);
    adminAuth.deleteUser.mockResolvedValueOnce(undefined);

    const res = await request(app).post('/delete-account').send({ idToken: 'tok' });

    expect(adminDbRef.remove).toHaveBeenCalled();
    expect(adminAuth.deleteUser).toHaveBeenCalledWith('del-uid');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Account deleted successfully' });
  });

  it('returns 500 when verification fails', async () => {
    adminAuth.verifyIdToken.mockRejectedValueOnce(new Error('bad'));

    const res = await request(app).post('/delete-account').send({ idToken: 'tok' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to delete account' });
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------
describe('POST /logout', () => {
  it('clears the authToken cookie', async () => {
    const res = await request(app).post('/logout').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Logged out successfully' });
    expect(res.headers['set-cookie'][0]).toMatch(/^authToken=;/);
  });
});

// ---------------------------------------------------------------------------
// refreshExtensionToken
// ---------------------------------------------------------------------------
describe('POST /refresh-extension-token', () => {
  it('mints a custom token for req.user.uid', async () => {
    adminAuth.createCustomToken.mockResolvedValueOnce('fresh-ext-token');

    const res = await request(app).post('/refresh-extension-token').send({});

    expect(adminAuth.createCustomToken).toHaveBeenCalledWith('uid-123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, extensionToken: 'fresh-ext-token' });
  });
});
