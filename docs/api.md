# 服务请求器

从 `@deepberry/common/js/api` 导入 `$uc`、`$titan`、`$cms`、`$admin`、`$erp`、`$pay`、`$next`、`$io`。每次调用返回一个 Axios 实例，标准接口仍通过 `response.data` 访问响应，不自动拆掉 Axios 包装。

```js
import { $uc, $titan } from "@deepberry/common/js/api";

$uc().get("user/info");
$titan().get("enterprise/organization/notification-config");
```

## 地址与环境变量

地址优先级：单次请求的 `options.domain` → `VUE_APP_服务名_API` → `VUE_APP_SERVICE_API`。地址末尾有没有 `/` 均可。

| 请求器   | 独立地址变量        | 自动添加的路径 |
| -------- | ------------------- | -------------- |
| `$uc`    | `VUE_APP_UC_API`    | `/api/uc/`     |
| `$titan` | `VUE_APP_TITAN_API` | `/api/titan/`  |
| `$cms`   | `VUE_APP_CMS_API`   | `/api/cms/`    |
| `$admin` | `VUE_APP_ADMIN_API` | `/api/admin/`  |
| `$erp`   | `VUE_APP_ERP_API`   | `/api/erp/`    |
| `$pay`   | `VUE_APP_PAY_API`   | `/api/pay/`    |
| `$next`  | `VUE_APP_NEXT_API`  | `/api/`        |
| `$io`    | `VUE_APP_IO_API`    | `/`            |

生产环境的 Node 服务通常只需统一入口：

```dotenv
VUE_APP_SERVICE_API=https://service.deepberry.cn
```

本地 `.env.development.local` 只覆盖正在联调的服务，其余使用 `.env.development` 中的统一入口：

```dotenv
VUE_APP_UC_API=http://localhost:38010
VUE_APP_TITAN_API=http://localhost:38000
```

调用 `.get()` 等方法时传服务内路径，不重复添加 `/api/uc` 等前缀。没有配置域名时使用当前网站的同源路径。Next、IO 的协议与 Node 服务不同，因此保留它们原有的 `/api/`、`/` 路径。

## 可选开发代理

默认直连 env 中的地址。需要处理本地跨域时，在开发环境开启：

```dotenv
VUE_APP_PROXY_ENABLE=1
# 可省略，默认 /__proxy
VUE_APP_PROXY_PREFIX=/__proxy
```

Vue CLI 的 `vue.config.js`：

```js
const { createDevProxy } = require("@deepberry/common/js/proxy.cjs");
module.exports = { devServer: { proxy: createDevProxy() } };
```

请求器与开发代理共用服务映射。例如 `$uc().get("user/info")` 请求 `/__proxy/uc/api/uc/user/info`，开发服务器移除 `/__proxy/uc` 后转发到 `VUE_APP_UC_API`。不再配置 `LOCAL_*_API_TARGET`，也不将 API 地址写成前端开发端口。只在 `NODE_ENV=development` 时启用，生产构建始终使用真实地址。

单次请求可用 `{ proxy: false }` 直连。指定 `{ domain: "http://localhost:40000" }` 时也直连该地址，不会被 env 对应的代理目标覆盖。修改 env 或代理配置后重启开发服务器。

## 应用接入

common 不依赖组件库、Element Plus 或应用路由。应用通过 `createApiClient()` 提供 Token 获取、错误提示与登录失效行为：

```js
import { createApiClient } from "@deepberry/common/js/api";

const client = createApiClient({
  getToken: (version) => User.getToken({ version }),
  onError: (message, popType, error) => showError(message, popType),
  onUnauthorized: () => {
    User.destroy();
    User.toLogin();
  },
});
export const { $uc, $titan, $cms, $admin, $pay, resolveServiceUrl } = client;
```

默认 Token 为 V2，只有 IO 默认 V1。默认 Token 读取器读取 sessionStorage 的 `__token`，然后读取 sessionStorage/localStorage 的 `TOKEN_TITAN_V2`（V1 为 `TOKEN_TITAN`）。应用应传入自己的 `User.getToken`，保留小程序 URL Token 等登录约定；common 不负责解析登录 URL。

标准请求默认 `withCredentials: false`，IO 保留 `true`。`$admin` 表示服务路径，仍使用同一个用户 V2 Token，不代表切换为后台管理员身份。

标准响应中的非零 `code` 会提示并 reject，负数会调用 `onUnauthorized`。`mute: true` 只关闭提示；`special: true` 允许业务层接收非零 `code`，但负数仍触发登录失效回调。`interceptor: false` 完全关闭响应拦截。IO 默认返回 `response.data`。

组件库旧接口由组件处理业务 `code`，迁移时可使用 `validateResponse: false` 保持这一行为，HTTP/网络错误仍统一提示。不同 `createApiClient()` 实例之间的回调独立，不互相覆盖。取消请求不提示错误。

```js
$uc({ mute: true }, { timeout: 5000 });
$titan({ domain: "http://localhost:38000", headers: { "X-App": "uc" } });
```

第二个参数为 Axios 配置，优先于默认配置，调用方对象不会被修改。`progress` 可传上传进度回调，`tokenVersion: 1` 可显式使用旧 Token。

SSE、fetch 等非 Axios 请求也应使用同一地址解析器；这里传完整的 API 路径：

```js
const url = client.resolveServiceUrl("cms", "/api/cms/intelligence/ask");
fetch(url, {
  headers: { Authorization: "Bearer " + User.getToken({ version: 2 }) },
});
// 原生 EventSource / URL 需要绝对地址时：
const absoluteUrl = new URL(url, window.location.origin);
```

## 迁移约定

新代码统一使用服务名：`$serviceTitan → $titan`、`$serviceAdmin → $admin`、`$service → $cms`。旧 `js/https.js` 与 `js/interceptors.js` 保留原有行为，便于其他项目逐步迁移。组件库的 `$titan2`、`$service` 公开导出保留为兼容别名。

验证：`npm test`，覆盖线上/本地地址、代理、认证、响应兼容、网络错误及真实本地 HTTP 请求。发包流程会先运行测试。
