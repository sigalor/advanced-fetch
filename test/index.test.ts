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

  // TODO: add many more unit tests for cookies, encoding, etc.
});
