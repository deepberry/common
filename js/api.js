import axios from "axios";
import apiConfig from "./api-config.cjs";

const { services, resolveServiceUrl: resolveUrl } = apiConfig;

// 必须静态读取，Vue CLI 才能在编译时替换；不在浏览器中访问 process.env[key]。
function readEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VUE_APP_PROXY_ENABLE: process.env.VUE_APP_PROXY_ENABLE,
    VUE_APP_PROXY_PREFIX: process.env.VUE_APP_PROXY_PREFIX,
    VUE_APP_SERVICE_API: process.env.VUE_APP_SERVICE_API,
    VUE_APP_UC_API: process.env.VUE_APP_UC_API,
    VUE_APP_TITAN_API: process.env.VUE_APP_TITAN_API,
    VUE_APP_CMS_API: process.env.VUE_APP_CMS_API,
    VUE_APP_ADMIN_API: process.env.VUE_APP_ADMIN_API,
    VUE_APP_ERP_API: process.env.VUE_APP_ERP_API,
    VUE_APP_PAY_API: process.env.VUE_APP_PAY_API,
    VUE_APP_NEXT_API: process.env.VUE_APP_NEXT_API,
    VUE_APP_IO_API: process.env.VUE_APP_IO_API,
  };
}

function readToken(version) {
  const key = version === 1 ? "TOKEN_TITAN" : "TOKEN_TITAN_V2";
  try {
    return (
      sessionStorage.getItem("__token") ||
      sessionStorage.getItem(key) ||
      localStorage.getItem(key) ||
      ""
    );
  } catch {
    return "";
  }
}

function errorMessage(error) {
  const response = error.response;
  return (
    response?.data?.msg ||
    response?.data?.message ||
    (response
      ? `[${response.status}]${response.statusText || "请求失败"}`
      : error.message || "网络请求异常")
  );
}

/** 创建独立配置的请求器，公共库不依赖组件库、UI 框架或登录路由。 */
export function createApiClient(context = {}) {
  const env = context.env || readEnv();
  const getToken = context.getToken || readToken;
  const notify = (message, options, error) => {
    if (!options.mute && message)
      context.onError?.(message, options.popType || "message", error);
  };

  function resolveServiceUrl(serviceKey, path = "", options = {}) {
    return resolveUrl(serviceKey, path, env, options);
  }

  function request(serviceKey, options = {}, axiosConfig = {}) {
    const spec = services[serviceKey];
    if (!spec) throw new Error(`未知服务：${serviceKey}`);
    const token = getToken(options.tokenVersion || spec.tokenVersion || 2);
    const ins = axios.create({
      withCredentials: serviceKey === "io",
      baseURL: resolveServiceUrl(serviceKey, spec.path, options),
      ...(options.progress ? { onUploadProgress: options.progress } : {}),
      ...axiosConfig,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
        ...axiosConfig.headers,
      },
    });

    if (options.interceptor !== false) {
      ins.interceptors.response.use(
        (response) => {
          if (spec.simple) return response.data;
          const data = response.data;
          if (context.validateResponse !== false && data?.code) {
            if (!options.special)
              notify(
                data.msg && `[${data.code}]${data.msg}`,
                options,
                response
              );
            if (data.code < 0) context.onUnauthorized?.(response);
            if (!options.special) return Promise.reject(response);
          }
          return response;
        },
        (error) => {
          // 取消请求不属于业务错误，也不应触发退出登录。
          if (!axios.isCancel(error))
            notify(errorMessage(error), options, error);
          return Promise.reject(error);
        }
      );
    }
    return ins;
  }

  return {
    resolveServiceUrl,
    ...Object.fromEntries(
      Object.keys(services).map((key) => [
        `$${key}`,
        (options, config) => request(key, options, config),
      ])
    ),
  };
}

const client = createApiClient();
export const {
  $uc,
  $titan,
  $cms,
  $admin,
  $erp,
  $pay,
  $next,
  $io,
  resolveServiceUrl,
} = client;
export { axios };
