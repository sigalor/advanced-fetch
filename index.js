const util = require('util');
const fs = require('fs-extra');
const nodeFetch = require('node-fetch');
const { CookieJar } = require('tough-cookie');
const fetchCookie = require('fetch-cookie');
const FormData = require('form-data');
const { URLSearchParams } = require('url');
const querystring = require('querystring');
const iconv = require('iconv-lite');
const https = require('https');

CookieJar.deserialize = util.promisify(CookieJar.deserialize);

function promisifyCookieJar(jar) {
  jar.serialize = util.promisify(jar.serialize);
  jar.getCookies = util.promisify(jar.getCookies);
  return jar;
}

class Fetch {
  constructor({ cookiesFilename, encoding, commonFetchParams, ignoreInvalidHttps } = {}) {
    if (ignoreInvalidHttps) {
      commonFetchParams = {
        ...commonFetchParams,
        agent: new https.Agent({ rejectUnauthorized: false }),
      };
    }

    this.cookiesFilename = cookiesFilename;
    this.encoding = encoding;
    this.commonFetchParams = commonFetchParams;

    return (async () => {
      if (this.cookiesFilename && (await fs.exists(this.cookiesFilename)))
        this.jar = promisifyCookieJar(await CookieJar.deserialize(await fs.readJSON(this.cookiesFilename)));
      else this.jar = promisifyCookieJar(new CookieJar());
      this.fetch = fetchCookie(nodeFetch, this.jar);
      return this;
    })();
  }

  async requestWithHeaders(url, params = {}) {
    // process GET query string
    let queryStr = '';
    if (params.query) {
      if (Object.keys(params.query).length > 0) queryStr = '&' + querystring.stringify(params.query);
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
      const appendToForm = (k, v) => {
        if (Array.isArray(v)) v.forEach(x => form.append(k, x.toString()));
        if (typeof v === 'object') form.append(k, v.value, v.options);
        else form.append(k, v.toString());
      };

      for (const [k, v] of Object.entries(params.formData)) {
        if (Array.isArray(v)) v.forEach(vItem => appendToForm(k, vItem));
        else appendToForm(k, v);
      }
      params.body = form;
      delete params.formData;
    } else if (params.json) {
      params.body = JSON.stringify(params.json);
      params.headers['Content-Type'] = 'application/json';
      delete params.json;
    }

    // execute request and store cookies if cookieFilename was given in constructor
    const resp = await this.fetch(url + queryStr, {
      ...params,
      ...this.commonFetchParams,
    });
    if (resp.status >= 500) throw new Error(resp.status + ' ' + resp.statusText);
    await this.storeCookies();

    // if an encoding was given in the Fetch constructur, the response still needs to be converted from that to UTF-8
    let encoding = params.encoding || this.encoding;
    let content = await (params.returnBuffer || encoding ? resp.buffer() : resp.text());
    if (!params.returnBuffer && encoding) content = iconv.decode(content, encoding);

    return {
      status: resp.status,
      headers: resp.headers.raw(),
      content,
    };
  }

  async requestWithFullResponse(url, params = {}) {
    // only let node-fetch follow redirects if that's explicitly stated
    if (params.redirect === 'follow') return (await this.requestWithHeaders(url, params)).content;

    // otherwise follow them manually, because otherwise Set-Cookie is ignored for redirecting sites
    let nextUrl = url;
    let currResp;
    params = { ...params, redirect: 'manual' };
    while (true) {
      currResp = await this.requestWithHeaders(nextUrl, params);
      if (currResp.status < 300 || currResp.status >= 400) break;
      else if (currResp.status !== 301 && currResp.status !== 302)
        throw new Error('unknown HTTP redirect status: ' + currResp.status);

      const loc = currResp.headers.location;
      if (!loc || (Array.isArray(loc) && loc.length !== 1)) break;
      nextUrl = Array.isArray(loc) ? loc[0] : loc;
      params = { method: 'GET' };
    }

    return currResp;
  }

  async request(url, params = {}) {
    return (await this.requestWithFullResponse(url, params)).content;
  }

  get(url, params = {}) {
    return this.request(url, { ...params, method: 'GET' });
  }

  post(url, params = {}) {
    return this.request(url, { ...params, method: 'POST' });
  }

  put(url, params = {}) {
    return this.request(url, { ...params, method: 'PUT' });
  }

  delete(url, params = {}) {
    return this.request(url, { ...params, method: 'DELETE' });
  }

  async storeCookies() {
    if (!this.cookiesFilename) return;
    await fs.writeJSON(this.cookiesFilename, await this.jar.serialize(), {
      spaces: 4,
    });
  }

  async getCookie(key) {
    const cookie = (await this.jar.serialize()).cookies.find(c => c.key === key);
    if (!cookie) return;
    return cookie.value;
  }
}

module.exports = { Fetch };
