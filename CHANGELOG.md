# 3.1.1 (2023-01-10)

- also export all types and interfaces for TypeScript

# 3.1.0 (2023-01-10)

- do not use any default redirect mode anymore, i.e. use the default behavior of node-fetch in case nothing else is mentioned
- `AdvancedFetchResponse.urls` is not optional anymore

# 3.0.0 (2023-01-10)

- upgrade to node-fetch@3 via [node-fetch-commonjs](https://www.npmjs.com/package/node-fetch-commonjs)
- introduce new redirect mode called `followWithCookies` which is the default and where the redirects respect cookies
- change `returnBuffer: true` to `returnType: "buffer"`, with the following possible values for `returnType`: string (default), buffer, json (actual default when response has `Content-Type: application/json`)

# 2.2.1 (2023-01-10)

- rebuild library

# 2.2.0 (2023-01-10)

- add AdvancedFetchResponse.urls with list of redirected URLs

# 2.1.0 (2023-01-10)

- update NPM dependencies

# 2.0.0 (2022-09-02)

- fix array form parameters and encoding handling
- update NPM dependencies
- add `CHANGELOG.md` file
- add badges to readme
- change constructor usage from `await new Fetch(...)` to just `new Fetch()`
- add basic unit tests
- rewrite entire library in TypeScript

# 1.1.0 (2021-08-24)

- add `commonFetchParams` and `ignoreInvalidHttps` constructor parameters
- add `getCookie` and `requestWithFullResponse` utility functions
- update NPM dependencies

# 1.0.0 (2020-11-01)

- initial release
