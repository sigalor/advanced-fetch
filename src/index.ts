import util from 'util';
import fs from 'fs-extra';
import nodeFetch from 'node-fetch-commonjs';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import FormData from 'form-data';
import { URLSearchParams } from 'url';
import iconv from 'iconv-lite';
import https from 'https';

CookieJar.deserialize = util.promisify(CookieJar.deserialize);

function promisifyCookieJar(jar: CookieJar): CookieJar {
  jar.serialize = util.promisify(jar.serialize);
  jar.getCookies = util.promisify(jar.getCookies);
  return jar;
}

export interface FetchOptions {
  // cookies can be stored in this file using the `storeCookies` function in the format of `tough-cookie`
  // also, when this filename is given, cookies will be loaded from this file in the first request
  cookiesFilename?: string;

  // global encoding to be used for all requests (can still be overridden in `RequestParams`)
  encoding?: string;

  // options that should always be passed to `node-fetch` calls
  commonFetchParams?: any;

  // ignores issues with HTTPS by setting `rejectUnauthorized: false`
  ignoreInvalidHttps?: boolean;
}

export type FormDataValue = string | string[] | { value: any; options: FormData.AppendOptions | string };

export type RequestReturnType = 'string' | 'json' | 'buffer';

export interface AdvancedFetchRequestParams {
  // HTTP headers
  headers?: { [key: string]: string };

  // GET query parameters, serialized using URLSearchParams
  query?: { [key: string]: string };

  // form data for the body of a `Content-Type: application/x-www-form-urlencoded` request
  form?: { [key: string]: string | string[] };

  // form data for the body of a `Content-Type: multipart/form-data` request
  formData?: { [key: string]: FormDataValue };

  // arbitrary JSON for the body of a `Content-Type: application/json` request
  json?: any;

  // encoding from which the response should be converted to UTF-8
  encoding?: string;

  // whether a string (which is the default), parsed JSON (which is the actual default when
  // the response's Content-Type is application/json) or a Buffer should be returned
  returnType?: RequestReturnType;

  // the default is "followWithCookies", because only then Set-Cookie is respected for redirecting sites
  // otherwise the desired regular node-fetch redirect behavior is used
  redirect?: RequestRedirect | 'followWithCookies';

  // HTTP method
  method?: string;
}

export interface AdvancedFetchResponse {
  // list of URLs that were followed to get to this response (only set when params.redirect was "manual") with the one of the final response last
  // otherwise, this contains either one URL (if no redirects were followed) or two URLs (if a redirect was followed)
  urls: string[];

  // when following redirects, the following properties only refer to the last, final response
  status: number;
  headers: { [key: string]: string };
  content: any;
}

export default class Fetch {
  private options: FetchOptions;
  private jar?: CookieJar;
  private fetch?: any;
  private initialized: boolean = false;

  constructor(options: FetchOptions = {}) {
    this.options = options;

    if (options.ignoreInvalidHttps) {
      options.commonFetchParams = {
        ...options.commonFetchParams,
        agent: new https.Agent({ rejectUnauthorized: false }),
      };
    }
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.options.cookiesFilename && fs.existsSync(this.options.cookiesFilename))
      this.jar = promisifyCookieJar(await CookieJar.deserialize(await fs.readJSON(this.options.cookiesFilename)));
    else this.jar = promisifyCookieJar(new CookieJar());
    this.fetch = fetchCookie(nodeFetch, this.jar);
    this.initialized = true;
  }

  async requestWithHeaders(url: string, params: AdvancedFetchRequestParams = {}): Promise<AdvancedFetchResponse> {
    await this.initialize();

    // process GET query string
    let queryStr = '';
    if (params.query) {
      if (Object.keys(params.query).length > 0) queryStr = '&' + new URLSearchParams(params.query).toString();
      delete params.query;
    }

    // make sure headers object exists
    if (!params.headers) params.headers = {};

    // process request body (params should only have one of "form", "formData" or "json")
    let body: any = undefined;
    if (params.form) {
      body = new URLSearchParams(params.form);
      delete params.form;
    } else if (params.formData) {
      const form = new FormData();
      const appendToForm = (k: string, v: FormDataValue) => {
        if (Array.isArray(v)) v.forEach(x => form.append(k, x.toString()));
        else if (typeof v === 'object') form.append(k, v.value, v.options);
        else form.append(k, v.toString());
      };

      for (const [k, v] of Object.entries(params.formData)) {
        if (Array.isArray(v)) v.forEach(vItem => appendToForm(k, vItem));
        else appendToForm(k, v);
      }
      body = form;
      delete params.formData;
    } else if (params.json) {
      body = JSON.stringify(params.json);
      params.headers['Content-Type'] = 'application/json';
      delete params.json;
    }

    // execute request and store cookies if cookieFilename was given in constructor
    const resp = await this.fetch(url + queryStr, {
      body,
      ...params,
      ...this.options.commonFetchParams,
    });
    if (resp.status >= 500) throw new Error(resp.status + ' ' + resp.statusText);
    await this.storeCookies();

    // if an encoding was given in the Fetch constructur, the response still needs to be converted from that to UTF-8
    let encoding = params.encoding || this.options.encoding;
    let content = await (params.returnType === 'buffer' || encoding ? resp.buffer() : resp.text());
    if (params.returnType !== 'buffer' && encoding) content = iconv.decode(content, encoding);
    if (
      params.returnType === 'json' ||
      (resp.headers.get('content-type')?.startsWith('application/json') &&
        params.returnType !== 'buffer' &&
        params.returnType !== 'string')
    ) {
      content = JSON.parse(content);
    }

    return {
      urls: url === resp.url ? [url] : [url, resp.url],
      status: resp.status,
      headers: resp.headers.raw(),
      content,
    };
  }

  async requestWithFullResponse(url: string, params: AdvancedFetchRequestParams = {}): Promise<AdvancedFetchResponse> {
    if (params.redirect === 'followWithCookies') {
      // otherwise follow them manually, in order to also save the cookies set via Set-Cookie by intermediate redirects in the cookie jar
      let nextUrl = url;
      let currOrigin = new URL(url).origin;
      let currResp: AdvancedFetchResponse;
      const manuallyFollowedUrls = [url];
      params = { ...params, redirect: 'manual' };
      while (true) {
        currResp = await this.requestWithHeaders(nextUrl, params);
        if (currResp.status < 300 || currResp.status >= 400) break;
        else if (currResp.status !== 301 && currResp.status !== 302)
          throw new Error('unknown HTTP redirect status: ' + currResp.status);

        const loc = currResp.headers.location;
        if (!loc || (Array.isArray(loc) && loc.length !== 1)) break;
        nextUrl = Array.isArray(loc) ? loc[0] : loc;

        // make sure nextUrl is absolute (if it is, set is as the new origin, otherwise use the same origin like before)
        if (nextUrl.startsWith('/')) nextUrl = currOrigin + nextUrl;
        else currOrigin = new URL(nextUrl).origin;

        manuallyFollowedUrls.push(nextUrl);
        params = { method: 'GET' };
      }

      if (currResp.urls[currResp.urls.length - 1] !== manuallyFollowedUrls[manuallyFollowedUrls.length - 1])
        manuallyFollowedUrls.push(currResp.urls[currResp.urls.length - 1]);

      return { ...currResp, urls: manuallyFollowedUrls };
    }

    return await this.requestWithHeaders(url, params);
  }

  async request(url: string, params: AdvancedFetchRequestParams = {}): Promise<any> {
    return (await this.requestWithFullResponse(url, params)).content;
  }

  get(url: string, params: AdvancedFetchRequestParams = {}): Promise<any> {
    return this.request(url, { ...params, method: 'GET' });
  }

  post(url: string, params: AdvancedFetchRequestParams = {}): Promise<any> {
    return this.request(url, { ...params, method: 'POST' });
  }

  put(url: string, params: AdvancedFetchRequestParams = {}): Promise<any> {
    return this.request(url, { ...params, method: 'PUT' });
  }

  delete(url: string, params: AdvancedFetchRequestParams = {}): Promise<any> {
    return this.request(url, { ...params, method: 'DELETE' });
  }

  async storeCookies(): Promise<void> {
    await this.initialize();

    if (!this.options.cookiesFilename || !this.jar) return;
    await fs.writeJSON(this.options.cookiesFilename, await this.jar.serialize(), {
      spaces: 4,
    });
  }

  async getCookie(key: string): Promise<string | undefined> {
    await this.initialize();

    if (!this.jar) return;
    const cookie = (await this.jar.serialize()).cookies.find(c => c.key === key);
    if (!cookie) return;
    return cookie.value;
  }
}
