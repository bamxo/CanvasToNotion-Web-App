import axios from 'axios';
import {expect, jest, test} from '@jest/globals';
import { request_access_token } from '../src/notion_api/juan_api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;


it('calls to api', async () => {

    const mockRes = {data: {access_token: "fakeToken"}};
    mockedAxios.mockResolvedValue(mockRes);
});