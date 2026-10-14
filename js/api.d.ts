import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export type ServiceKey =
  | "uc"
  | "titan"
  | "cms"
  | "admin"
  | "erp"
  | "pay"
  | "next"
  | "io";
export interface RequestOptions {
  domain?: string;
  proxy?: boolean;
  tokenVersion?: 1 | 2;
  interceptor?: boolean;
  mute?: boolean;
  special?: boolean;
  popType?: string;
  headers?: AxiosRequestConfig["headers"];
  progress?: AxiosRequestConfig["onUploadProgress"];
}
export interface ClientOptions {
  env?: Record<string, string | undefined>;
  getToken?: (version: number) => string | null | undefined;
  onError?: (message: string, popType: string, error: unknown) => void;
  onUnauthorized?: (response: AxiosResponse) => void;
  validateResponse?: boolean;
}
export type RequestFactory = (
  options?: RequestOptions,
  config?: AxiosRequestConfig
) => AxiosInstance;
export interface ApiClient {
  $uc: RequestFactory;
  $titan: RequestFactory;
  $cms: RequestFactory;
  $admin: RequestFactory;
  $erp: RequestFactory;
  $pay: RequestFactory;
  $next: RequestFactory;
  $io: RequestFactory;
  resolveServiceUrl: (
    serviceKey: ServiceKey,
    path?: string,
    options?: RequestOptions
  ) => string;
}
export function createApiClient(options?: ClientOptions): ApiClient;
export const $uc: RequestFactory;
export const $titan: RequestFactory;
export const $cms: RequestFactory;
export const $admin: RequestFactory;
export const $erp: RequestFactory;
export const $pay: RequestFactory;
export const $next: RequestFactory;
export const $io: RequestFactory;
export const resolveServiceUrl: ApiClient["resolveServiceUrl"];
export { default as axios } from "axios";
