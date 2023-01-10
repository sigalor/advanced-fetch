import express from 'express';
import http from 'http';

const app = express();
let server: http.Server | undefined = undefined;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/redirect', (req, res) => {
  res.redirect(301, '/');
});

export async function startServer(port: number): Promise<void> {
  return new Promise(resolve => {
    if (server) {
      resolve();
      return;
    } else {
      server = app.listen(port, resolve);
    }
  });
}

export async function stopServer(): Promise<void> {
  if (!server) return;
  server.close();
  server = undefined;
}
