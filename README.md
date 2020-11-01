# advanced-fetch

A version of node-fetch with more convenient functionality.

## Usage

```javascript
const { Fetch } = require("advanced-fetch");

(async () => {
  const fetch = await new Fetch();
  await fetch.get("http://example.com");
  // subsequent requests to example.com now send the received
  // cookies again, and the cookies are updated automatically
})();
```

## Constructor

The `Fetch` constructor expects an optional object, with the following possible attributes:

- `cookiesFilename`: If given, the [tough-cookie](https://www.npmjs.com/package/tough-cookie) cookie jar is serialized into JSON after each request and that JSON is written into the specified file.
- `encoding`: If given, the received responses are assumed to be in that text encoding and converted automatically to UTF-8 via [iconv-lite](https://www.npmjs.com/package/iconv-lite) before they are returned to you.

## Request parameters

Supports `.get`, `.post`, `.put` and `.delete`. After the URL, all of these functions also expect an optional object with [node-fetch](https://www.npmjs.com/package/node-fetch) request parameters.

Additionally, you can specify the following parameters as normal JavaScript objects, which are serialized respectively automatically:

- `query` for GET query parameters, internally serialized using [querystring](https://nodejs.org/api/querystring.html)
- `form` for the body of a `Content-Type: application/x-www-form-urlencoded` request, internally serialized using [URLSearchParams](https://nodejs.org/api/url.html#url_class_urlsearchparams)
- `formData` for the body of a `Content-Type: multipart/form-data` request, internally serialized using [form-data](https://www.npmjs.com/package/form-data)
- `json` for the body of a `Content-Type: application/json` request, internally serialized using `JSON.stringify`

Finally, you can specify `returnBuffer: true` in the parameters object in order to get a Node.js `Buffer` as the result of a request instead of a string.
