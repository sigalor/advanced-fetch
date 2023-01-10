import Fetch from '../src';
import { startServer, stopServer } from './server';

const port = 3000;
const baseUrl = `http://localhost:${port}`;

beforeAll(async () => {
  try {
    await startServer(port);
  } catch (error) {
    process.exit(1);
  }
});

afterAll(async () => {
  await stopServer();
});

describe('advanced-fetch', () => {
  test('can GET /', async () => {
    const fetch = new Fetch();
    const response = await fetch.get(`${baseUrl}/`);
    expect(response).toBe('Hello World!');
  });

  test('returns the given URL when using manual redirects', async () => {
    const fetch = new Fetch();
    const response = await fetch.requestWithFullResponse(`${baseUrl}/redirect`);

    expect(response.urls).toHaveLength(2);
    expect(response.urls![0]).toBe(`${baseUrl}/redirect`);
    expect(response.urls![1]).toBe(`${baseUrl}/`);
  });

  // TODO: add many more unit tests for cookies, encoding, etc.
});
