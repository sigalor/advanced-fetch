import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import http from 'http';

const app = express();
app.use(cookieParser());
app.use(bodyParser.json());

let server: http.Server | undefined = undefined;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/json', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/redirect', (req, res) => {
  res.redirect(301, '/');
});

app.post('/set-cookies', (req, res) => {
  for (const [k, v] of Object.entries(req.body)) {
    res.cookie(k, v);
  }
  res.status(204).send();
});

app.post('/set-cookies-and-redirect-to-get-cookies', (req, res) => {
  for (const [k, v] of Object.entries(req.body)) {
    res.cookie(k, v);
  }
  res.redirect(301, '/get-cookies');
});

app.get('/get-cookies', (req, res) => {
  res.json(req.cookies);
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
