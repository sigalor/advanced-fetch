"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("util"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const tough_cookie_1 = require("tough-cookie");
const fetch_cookie_1 = __importDefault(require("fetch-cookie"));
const form_data_1 = __importDefault(require("form-data"));
const url_1 = require("url");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const https_1 = __importDefault(require("https"));
tough_cookie_1.CookieJar.deserialize = util_1.default.promisify(tough_cookie_1.CookieJar.deserialize);
function promisifyCookieJar(jar) {
    jar.serialize = util_1.default.promisify(jar.serialize);
    jar.getCookies = util_1.default.promisify(jar.getCookies);
    return jar;
}
class Fetch {
    constructor(options = {}) {
        this.initialized = false;
        this.options = options;
        if (options.ignoreInvalidHttps) {
            options.commonFetchParams = {
                ...options.commonFetchParams,
                agent: new https_1.default.Agent({ rejectUnauthorized: false }),
            };
        }
    }
    async initialize() {
        if (this.initialized)
            return;
        if (this.options.cookiesFilename && fs_extra_1.default.existsSync(this.options.cookiesFilename))
            this.jar = promisifyCookieJar(await tough_cookie_1.CookieJar.deserialize(await fs_extra_1.default.readJSON(this.options.cookiesFilename)));
        else
            this.jar = promisifyCookieJar(new tough_cookie_1.CookieJar());
        this.fetch = (0, fetch_cookie_1.default)(node_fetch_1.default, this.jar);
        this.initialized = true;
    }
    async requestWithHeaders(url, params = {}) {
        await this.initialize();
        // process GET query string
        let queryStr = '';
        if (params.query) {
            if (Object.keys(params.query).length > 0)
                queryStr = '&' + new url_1.URLSearchParams(params.query).toString();
            delete params.query;
        }
        // make sure headers object exists
        if (!params.headers)
            params.headers = {};
        // process request body (params should only have one of "form", "formData" or "json")
        let body = undefined;
        if (params.form) {
            body = new url_1.URLSearchParams(params.form);
            delete params.form;
        }
        else if (params.formData) {
            const form = new form_data_1.default();
            const appendToForm = (k, v) => {
                if (Array.isArray(v))
                    v.forEach(x => form.append(k, x.toString()));
                else if (typeof v === 'object')
                    form.append(k, v.value, v.options);
                else
                    form.append(k, v.toString());
            };
            for (const [k, v] of Object.entries(params.formData)) {
                if (Array.isArray(v))
                    v.forEach(vItem => appendToForm(k, vItem));
                else
                    appendToForm(k, v);
            }
            body = form;
            delete params.formData;
        }
        else if (params.json) {
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
        if (resp.status >= 500)
            throw new Error(resp.status + ' ' + resp.statusText);
        await this.storeCookies();
        // if an encoding was given in the Fetch constructur, the response still needs to be converted from that to UTF-8
        let encoding = params.encoding || this.options.encoding;
        let content = await (params.returnBuffer || encoding ? resp.buffer() : resp.text());
        if (!params.returnBuffer && encoding)
            content = iconv_lite_1.default.decode(content, encoding);
        return {
            status: resp.status,
            headers: resp.headers.raw(),
            content,
        };
    }
    async requestWithFullResponse(url, params = {}) {
        // only let node-fetch follow redirects if that's explicitly stated
        if (params.redirect === 'follow')
            return await this.requestWithHeaders(url, params);
        // otherwise follow them manually, because otherwise Set-Cookie is ignored for redirecting sites
        let nextUrl = url;
        let currResp;
        params = { ...params, redirect: 'manual' };
        while (true) {
            currResp = await this.requestWithHeaders(nextUrl, params);
            if (currResp.status < 300 || currResp.status >= 400)
                break;
            else if (currResp.status !== 301 && currResp.status !== 302)
                throw new Error('unknown HTTP redirect status: ' + currResp.status);
            const loc = currResp.headers.location;
            if (!loc || (Array.isArray(loc) && loc.length !== 1))
                break;
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
        await this.initialize();
        if (!this.options.cookiesFilename || !this.jar)
            return;
        await fs_extra_1.default.writeJSON(this.options.cookiesFilename, await this.jar.serialize(), {
            spaces: 4,
        });
    }
    async getCookie(key) {
        await this.initialize();
        if (!this.jar)
            return;
        const cookie = (await this.jar.serialize()).cookies.find(c => c.key === key);
        if (!cookie)
            return;
        return cookie.value;
    }
}
exports.default = Fetch;
