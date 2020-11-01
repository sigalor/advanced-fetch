const util = require("util");
const fs = require("fs-extra");
const nodeFetch = require("node-fetch");
const { CookieJar } = require("tough-cookie");
const fetchCookie = require("fetch-cookie");
const FormData = require("form-data");
const { URLSearchParams } = require("url");
const querystring = require("querystring");
const iconv = require("iconv-lite");

CookieJar.deserialize = util.promisify(CookieJar.deserialize);

function promisifyCookieJar(jar) {
  jar.serialize = util.promisify(jar.serialize);
  jar.getCookies = util.promisify(jar.getCookies);
  return jar;
}

class Fetch {
  constructor({ cookiesFilename, encoding } = {}) {
    this.cookiesFilename = cookiesFilename;
    this.encoding = encoding;
    return (async () => {
      if (this.cookiesFilename && (await fs.exists(this.cookiesFilename)))
        this.jar = promisifyCookieJar(
          await CookieJar.deserialize(await fs.readJSON(this.cookiesFilename))
        );
      else this.jar = promisifyCookieJar(new CookieJar());
      this.fetch = fetchCookie(nodeFetch, this.jar);
      return this;
    })();
  }

  async requestWithHeaders(url, params = {}) {
    // process GET query string
    let queryStr = "";
    if (params.query) {
      if (Object.keys(params.query).length > 0)
        queryStr = "&" + querystring.stringify(params.query);
      delete params.query;
    }

    // make sure headers object exists
    if (!params.headers) params.headers = {};

    // process request body (params should only have one of "form", "formData" or "json")
    if (params.form) {
      params.body = new URLSearchParams(params.form);
      delete params.form;
    } else if (params.formData) {
      const form = new FormData();
      for (const [k, v] of Object.entries(params.formData)) {
        if (typeof v === "string") form.append(k, v);
        else form.append(k, v.value, v.options);
      }
      params.body = form;
      delete params.formData;
    } else if (params.json) {
      params.body = JSON.stringify(params.json);
      params.headers["Content-Type"] = "application/json";
      delete params.json;
    }

    // execute request and store cookies if cookieFilename was given in constructor
    const resp = await this.fetch(url + queryStr, params);
    if (resp.status >= 500)
      throw new Error(resp.status + " " + resp.statusText);
    await this.storeCookies();

    // if an encoding was given in the Fetch constructur, the response still needs to be converted from that to UTF-8
    let content = await (params.returnBuffer || this.encoding
      ? resp.buffer()
      : resp.text());
    if (!params.returnBuffer && this.encoding)
      content = iconv.decode(content, this.encoding);

    return {
      status: resp.status,
      headers: resp.headers.raw(),
      content,
    };
  }

  async request(url, params = {}) {
    // only let node-fetch follow redirects if that's explicitly stated
    if (params.redirect === "follow")
      return (await this.requestWithHeaders(url, params)).content;

    // otherwise follow them manually, because otherwise Set-Cookie is ignored for redirecting sites
    let nextUrl = url;
    let currResp;
    params = { ...params, redirect: "manual" };
    while (true) {
      currResp = await this.requestWithHeaders(nextUrl, params);
      if (currResp.status < 300 || currResp.status >= 400) break;
      else if (currResp.status !== 301 && currResp.status !== 302)
        throw new Error("unknown HTTP redirect status: " + currResp.status);

      const loc = currResp.headers.location;
      if (!loc || (Array.isArray(loc) && loc.length !== 1)) break;
      nextUrl = Array.isArray(loc) ? loc[0] : loc;
      params = { method: "GET" };
    }

    return currResp.content;
  }

  get(url, params = {}) {
    return this.request(url, { ...params, method: "GET" });
  }

  post(url, params = {}) {
    return this.request(url, { ...params, method: "POST" });
  }

  put(url, params = {}) {
    return this.request(url, { ...params, method: "PUT" });
  }

  delete(url, params = {}) {
    return this.request(url, { ...params, method: "DELETE" });
  }

  async storeCookies() {
    if (!this.cookiesFilename) return;
    await fs.writeJSON(this.cookiesFilename, await this.jar.serialize(), {
      spaces: 4,
    });
  }
}

module.exports = { Fetch };
