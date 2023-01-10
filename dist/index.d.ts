/// <reference types="node" />
import FormData from 'form-data';
interface FetchOptions {
    cookiesFilename?: string;
    encoding?: string;
    commonFetchParams?: any;
    ignoreInvalidHttps?: boolean;
}
type FormDataValue = string | string[] | {
    value: any;
    options: FormData.AppendOptions | string;
};
interface AdvancedFetchRequestParams {
    headers?: {
        [key: string]: string;
    };
    query?: {
        [key: string]: string;
    };
    form?: {
        [key: string]: string | string[];
    };
    formData?: {
        [key: string]: FormDataValue;
    };
    json?: any;
    encoding?: string;
    returnBuffer?: boolean;
    redirect?: 'follow' | 'manual';
    method?: string;
}
interface AdvancedFetchResponse {
    urls?: string[];
    status: number;
    headers: {
        [key: string]: string;
    };
    content: string | Buffer;
}
export default class Fetch {
    private options;
    private jar?;
    private fetch?;
    private initialized;
    constructor(options?: FetchOptions);
    private initialize;
    requestWithHeaders(url: string, params?: AdvancedFetchRequestParams): Promise<AdvancedFetchResponse>;
    requestWithFullResponse(url: string, params?: AdvancedFetchRequestParams): Promise<AdvancedFetchResponse>;
    request(url: string, params?: AdvancedFetchRequestParams): Promise<string | Buffer>;
    get(url: string, params?: AdvancedFetchRequestParams): Promise<string | Buffer>;
    post(url: string, params?: AdvancedFetchRequestParams): Promise<string | Buffer>;
    put(url: string, params?: AdvancedFetchRequestParams): Promise<string | Buffer>;
    delete(url: string, params?: AdvancedFetchRequestParams): Promise<string | Buffer>;
    storeCookies(): Promise<void>;
    getCookie(key: string): Promise<string | undefined>;
}
export {};
