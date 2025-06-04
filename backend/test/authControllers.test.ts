import request from 'supertest';
import axios from 'axios';
import bodyParser from 'body-parser';
import { describe, afterEach, expect, it, beforeAll, beforeEach} from '@jest/globals';
import express, {Express} from "express"
import { jest } from '@jest/globals';
import { forgotPassword, signup, googleAuth, testDatabase, login} from '../public/controllers/authControllers';
import { AxiosError, isAxiosError } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

(axios as any).isAxiosError = (error: any): error is AxiosError => {
    return error && error.response !== undefined;
  };

const app = express();
app.use(bodyParser.json());

app.post('/forgot-password', forgotPassword);
app.post('/signup', signup);
app.post('/google-auth', googleAuth);
app.get('/test-database', testDatabase);

describe('POST /forgot-password', () => {
    const baseData = {
        email: 'user@example.com',
        password: 'testpass',
        displayName: 'Test User',
    };
        
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if email is missing', async () => {
        const res = await request(app).post('/forgot-password').send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Email is required' });
    });

    it('should return 200 if request is successful', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: {} });

        const res = await request(app)
        .post('/forgot-password')
        .send({ email: 'test@example.com' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Password reset email sent' });
    });
    
    it('should return 500 if unknown error occurs', async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error('Something went wrong'));

        const res = await request(app)
        .post('/forgot-password')
        .send({ email: 'test@example.com' });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to send password reset email' });
    });
    
    it('should fall back to email username if displayName not provided', async () => {
        const authData = {
        localId: 'xyz789',
        idToken: 'token-xyz',
        email: 'noname@example.com',
        };

        mockedAxios.post.mockResolvedValueOnce({ data: authData });
        mockedAxios.put.mockResolvedValueOnce({});

        const res = await request(app).post('/signup').send({
        email: authData.email,
        password: 'pass123',
        });

        expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/users/xyz789.json?auth=token-xyz'),
        expect.objectContaining({
            displayName: 'noname',
        })
        );

        expect(res.status).toBe(201);
        expect(res.body).toEqual(authData);
    });

    it('should return partial success if DB save fails', async () => {
        const authResponse = {
        data: {
            localId: 'failDB',
            idToken: 'fail-token',
            email: 'dbfail@example.com',
            displayName: 'DB Fail',
        },
        };

        mockedAxios.post.mockResolvedValueOnce(authResponse);
        mockedAxios.put.mockRejectedValueOnce(new Error('DB is down'));

        const res = await request(app).post('/signup').send({
        email: authResponse.data.email,
        password: '123456',
        displayName: 'DB Fail',
        });

        expect(res.status).toBe(201);
        expect(res.body).toEqual({
        ...authResponse.data,
        warning: 'User created but profile data not saved',
        });
    });

    it('should not try to save to DB if localId is missing', async () => {
        const authResponse = {
        data: {
            idToken: 'no-local-id-token',
            email: 'nolocal@example.com',
        },
        };

        mockedAxios.post.mockResolvedValueOnce(authResponse);

        const res = await request(app).post('/signup').send({
        email: 'nolocal@example.com',
        password: 'pass123',
        });

        expect(mockedAxios.put).not.toHaveBeenCalled();
        expect(res.status).toBe(201);
        expect(res.body).toEqual(authResponse.data);
    });
});

describe('POST /signup', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return 400 if email or password is missing', async () => {
      const res = await request(app).post('/signup').send({});
  
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Email and password are required' });
    });
  
    it('should create user and save profile data successfully', async () => {
      const mockAuthResponse = {
        data: {
          localId: 'user123',
          idToken: 'fake-token',
          email: 'test@example.com',
          displayName: 'Test User',
        },
      };
  
      mockedAxios.post.mockResolvedValueOnce(mockAuthResponse); // Auth creation
      mockedAxios.put.mockResolvedValueOnce({}); // DB save
  
      const res = await request(app).post('/signup').send({
        email: 'test@example.com',
        password: 'securePass123',
        displayName: 'Test User',
      });
  
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockAuthResponse.data);
    });
  
    it('should create user but warn if DB save fails', async () => {
      const mockAuthResponse = {
        data: {
          localId: 'user123',
          idToken: 'fake-token',
          email: 'test@example.com',
          displayName: 'Test User',
        },
      };
  
      mockedAxios.post.mockResolvedValueOnce(mockAuthResponse); // Auth creation
      mockedAxios.put.mockRejectedValueOnce(new Error('DB error')); // DB fail
  
      const res = await request(app).post('/signup').send({
        email: 'test@example.com',
        password: 'securePass123',
        displayName: 'Test User',
      });
  
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        ...mockAuthResponse.data,
        warning: 'User created but profile data not saved',
      });
    });
  
    it('should return Firebase error if signup fails', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              message: 'EMAIL_EXISTS',
            },
          },
        },
      });
  
      const res = await request(app).post('/signup').send({
        email: 'existing@example.com',
        password: 'password123',
      });
  
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'EMAIL_EXISTS' });
    });
  
    it('should return 500 on unexpected error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Unexpected'));
  
      const res = await request(app).post('/signup').send({
        email: 'unexpected@example.com',
        password: 'password123',
      });
  
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to create user' });
    });
  });


describe('POST /signup - Firebase mocked', () => {
    const mockEmail = 'mockuser@example.com';
    const mockPassword = 'secure123';
    const mockDisplayName = 'Mock User';
  
    const mockFirebaseAuthResponse = {
      data: {
        idToken: 'mock-id-token',
        email: mockEmail,
        refreshToken: 'mock-refresh-token',
        expiresIn: '3600',
        localId: 'mockLocalId123',
        displayName: mockDisplayName,
      },
    };
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should mock Firebase signup and database write', async () => {
      // 1. Mock Firebase auth response
      mockedAxios.post.mockResolvedValueOnce(mockFirebaseAuthResponse);
  
      // 2. Mock Firebase Realtime Database put response
      mockedAxios.put.mockResolvedValueOnce({});
  
      const res = await request(app).post('/signup').send({
        email: mockEmail,
        password: mockPassword,
        displayName: mockDisplayName,
      });
  
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('identitytoolkit.googleapis.com/v1/accounts:signUp'),
        expect.objectContaining({
          email: mockEmail,
          password: mockPassword,
          displayName: mockDisplayName,
          returnSecureToken: true,
        })
      );
  
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining(`/users/mockLocalId123.json?auth=mock-id-token`),
        expect.objectContaining({
          email: mockEmail,
          displayName: mockDisplayName,
        })
      );
  
      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockFirebaseAuthResponse.data);
    });
}); 


describe('POST /google-auth', () => {
  const mockIdToken = 'mock-google-id-token';
  const mockLocalId = 'google123';
  const mockAuthResponse = {
    data: {
      localId: mockLocalId,
      idToken: 'firebase-id-token',
      email: 'googleuser@example.com',
      displayName: 'Google User',
      photoUrl: 'http://photo.url/avatar.png',
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if no idToken is provided', async () => {
    const res = await request(app).post('/google-auth').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Google ID token is required' });
  });

  it('should authenticate and create user profile if new', async () => {
    // 1. Firebase signInWithIdp returns success
    mockedAxios.post.mockResolvedValueOnce(mockAuthResponse);

    // 2. Firebase GET returns null (user not found)
    mockedAxios.get.mockResolvedValueOnce({ data: null });

    // 3. Firebase PUT saves new user
    mockedAxios.put.mockResolvedValueOnce({});

    const res = await request(app).post('/google-auth').send({ idToken: mockIdToken });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('signInWithIdp'),
      expect.objectContaining({
        postBody: `id_token=${mockIdToken}&providerId=google.com`,
        returnSecureToken: true,
      })
    );

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining(`/users/${mockLocalId}.json`)
    );

    expect(mockedAxios.put).toHaveBeenCalledWith(
      expect.stringContaining(`/users/${mockLocalId}.json`),
      expect.objectContaining({
        email: 'googleuser@example.com',
        displayName: 'Google User',
        photoURL: 'http://photo.url/avatar.png',
      })
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockAuthResponse.data);
  });

  it('should not create user profile if user already exists', async () => {
    mockedAxios.post.mockResolvedValueOnce(mockAuthResponse);
    mockedAxios.get.mockResolvedValueOnce({ data: { existing: true } });

    const res = await request(app).post('/google-auth').send({ idToken: mockIdToken });

    expect(mockedAxios.get).toHaveBeenCalled();
    expect(mockedAxios.put).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockAuthResponse.data);
  });

  it('should return Firebase error if signInWithIdp fails', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          error: {
            message: 'INVALID_ID_TOKEN',
          },
        },
      },
    });

    const res = await request(app).post('/google-auth').send({ idToken: mockIdToken });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'INVALID_ID_TOKEN' });
  });

  it('should handle unexpected errors gracefully', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

    const res = await request(app).post('/google-auth').send({ idToken: mockIdToken });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Google authentication failed' });
  });
});


describe('GET /test-database', () => {
    it('should return 200 and success data on success', async () => {
      const fakeResponse = { message: 'Test write to Firebase' };
      mockedAxios.put.mockResolvedValue({ data: fakeResponse });
  
      const response = await request(app).get('/test-database');
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: fakeResponse
      });
    });  
    it('should return 500 and error message on Axios error', async () => {
        mockedAxios.put.mockRejectedValue({
          response: { data: { error: 'Permission denied' } }
        });
    
        const response = await request(app).get('/test-database');
    
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          error: 'Failed to write to database',
          details: { error: 'Permission denied' }
        });
    });
    it('should return 500 and error message on general error', async () => {
        mockedAxios.put.mockRejectedValue(new Error('Unexpected failure'));
    
        const response = await request(app).get('/test-database');
    
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          error: 'Failed to write to database',
          details: 'Unexpected failure'
        });
      });
});



describe('POST /login', () => {
    let app: Express;


    beforeAll(() => {
      app = express();
      app.use(bodyParser.json());
      app.post('/login', login);
    });
   
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return auth data without extension token', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          localId: 'mockLocalId',
          idToken: 'mockIdToken',
          refreshToken: 'mockRefreshToken',
          expiresIn: '3600'
        }
      });
  
      const res = await request(app).post('/login').send({
        email: 'test@example.com',
        password: 'password123',
        requestExtensionToken: false
      });
  
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('idToken');
      expect(res.body).not.toHaveProperty('extensionToken');
    });
  
    it('should return auth data without extension token', async () => {
      // Arrange mock response
      const mockAuthResponse = {
        data: {
          localId: 'mockLocalId',
          idToken: 'mockIdToken',
          refreshToken: 'mockRefreshToken',
          expiresIn: '3600'
        }
      };
  
      mockedAxios.post.mockResolvedValueOnce(mockAuthResponse);
  
      // Act
      const res = await request(app).post('/login').send({
        email: 'test@example.com',
        password: 'password123',
        requestExtensionToken: false
      });
  
      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('idToken');
      expect(res.body).not.toHaveProperty('extensionToken');
    });

    it('should return auth data with extension token when requested', async () => {
        // Arrange mock response
        const mockAuthResponse = {
          data: {
            localId: 'mockLocalId',
            idToken: 'mockIdToken',
            refreshToken: 'mockRefreshToken',
            expiresIn: '3600'
          }
        };
      
        mockedAxios.post.mockResolvedValueOnce(mockAuthResponse);
      
        // Act
        const res = await request(app).post('/login').send({
          email: 'test@example.com',
          password: 'password123',
          requestExtensionToken: true
        });
      
        // Assert
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('idToken');
        expect(res.body).toHaveProperty('extensionToken', 'mock-custom-token');
      });
    
  });