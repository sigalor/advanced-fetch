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
  test('can get a simple string', async () => {
    const fetch = new Fetch();
    const response = await fetch.get(`${baseUrl}/`);
    expect(response).toBe('Hello World!');
  });

  test('can get JSON and automatically parses it', async () => {
    const fetch = new Fetch();
    const response = await fetch.get(`${baseUrl}/json`);
    expect(response.message).toEqual('Hello World!');
  });

  test("doesn't parse JSON when told not to", async () => {
    const fetch = new Fetch();
    const response = await fetch.get(`${baseUrl}/json`, { returnType: 'string' });
    expect(response).toEqual('{"message":"Hello World!"}');
  });

  test('returns the URL chain when using manual redirects', async () => {
    const fetch = new Fetch();
    const response = await fetch.requestWithFullResponse(`${baseUrl}/redirect`);

    expect(response.urls).toHaveLength(2);
    expect(response.urls![0]).toBe(`${baseUrl}/redirect`);
    expect(response.urls![1]).toBe(`${baseUrl}/`);
  });

  test('can retain a cookie', async () => {
    const fetch = new Fetch();
    await fetch.post(`${baseUrl}/set-cookies`, { json: { mycookie: 'secret' } });
    const response = await fetch.get(`${baseUrl}/get-cookies`);
    expect(response.mycookie).toBe('secret');
  });

  test('can retain a cookie across a redirect', async () => {
    const fetch = new Fetch();
    const response = await fetch.post(`${baseUrl}/set-cookies-and-redirect-to-get-cookies`, {
      json: { mycookie: 'secret' },
    });
    expect(response.mycookie).toBe('secret');
  });

  test('correctly handles a query parameter', async () => {
    const fetch = new Fetch();
    const response = await fetch.get(`${baseUrl}/get-query`, { query: { hello: 'world' } });
    expect(response.hello).toBe('world');
  });

  test('correctly handles a query parameter appended to one already in the URL', async () => {
    const fetch = new Fetch();
    const response = await fetch.get(`${baseUrl}/get-query?hello=world`, { query: { foo: 'bar' } });
    expect(response.hello).toBe('world');
    expect(response.foo).toBe('bar');
  });

  // TODO: add many more unit tests for cookies, encoding, etc.
});
