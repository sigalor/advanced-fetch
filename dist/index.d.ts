import FormData from 'form-data';
export interface FetchOptions {
    cookiesFilename?: string;
    encoding?: string;
    commonFetchParams?: any;
    ignoreInvalidHttps?: boolean;
}
export type FormDataValue = string | string[] | {
    value: any;
    options: FormData.AppendOptions | string;
};
export type RequestReturnType = 'string' | 'json' | 'buffer';
export interface AdvancedFetchRequestParams {
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
    returnType?: RequestReturnType;
    redirect?: RequestRedirect | 'followWithCookies';
    method?: string;
}
export interface AdvancedFetchResponse {
    urls: string[];
    status: number;
    headers: {
        [key: string]: string;
    };
    content: any;
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
    request(url: string, params?: AdvancedFetchRequestParams): Promise<any>;
    get(url: string, params?: AdvancedFetchRequestParams): Promise<any>;
    post(url: string, params?: AdvancedFetchRequestParams): Promise<any>;
    put(url: string, params?: AdvancedFetchRequestParams): Promise<any>;
    delete(url: string, params?: AdvancedFetchRequestParams): Promise<any>;
    storeCookies(): Promise<void>;
    getCookie(key: string): Promise<string | undefined>;
}
