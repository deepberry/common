# 统一请求器

从 `@deepberry/common@0.3.15` 起，新代码统一使用 `@deepberry/common/js/api`。本文包含当前接口、开发代理和旧版迁移说明。`titan-greenhouse` 等已有应用接入时，按[兄弟仓库迁移指南](#兄弟仓库迁移指南)逐项实施。

## 快速使用

```js
import { $uc, $titan } from "@deepberry/common/js/api";

const response = await $uc().get("user/info");
const profile = response.data.data;

await $titan().get("enterprise/organization/notification-config");
```

每次调用 `$uc()` 等工厂函数都会创建一个 Axios 实例。标准请求保留完整的 Axios response：`response.data` 是后端响应体；后端采用 `{ code, msg, data }` 包装时，业务数据在 `response.data.data`。

直接导出的请求器使用默认 Token 读取规则和响应拦截，**不会自行弹窗、清理登录状态或跳转页面**。应用需要这些行为时，按下文创建自己的请求器。

## 服务地址

默认地址优先级：`options.domain` → 服务专用环境变量 → `VUE_APP_SERVICE_API`。地址包含 `http://` 或 `https://` 和可选端口，不包含 `/api/xx`；末尾 `/` 可省略。未配置地址或配置为 `/` 时，使用当前网站的同源路径。

| 请求器   | 服务专用环境变量    | 自动添加的路径 |
| -------- | ------------------- | -------------- |
| `$uc`    | `VUE_APP_UC_API`    | `/api/uc/`     |
| `$titan` | `VUE_APP_TITAN_API` | `/api/titan/`  |
| `$cms`   | `VUE_APP_CMS_API`   | `/api/cms/`    |
| `$admin` | `VUE_APP_ADMIN_API` | `/api/admin/`  |
| `$erp`   | `VUE_APP_ERP_API`   | `/api/erp/`    |
| `$pay`   | `VUE_APP_PAY_API`   | `/api/pay/`    |
| `$next`  | `VUE_APP_NEXT_API`  | `/api/`        |
| `$io`    | `VUE_APP_IO_API`    | `/`            |

`.get()`、`.post()` 等方法接收服务内路径，例如 `$uc().get("user/info")`。不要再次传入 `/api/uc/user/info`，封装不会自动移除重复前缀。

线上 Node 服务默认共用入口，由网关按 `/api/xx` 转发：

```dotenv
# .env.production
VUE_APP_SERVICE_API=https://service.deepberry.cn
```

开发环境的公共入口配置在 `.env.development`：

```dotenv
VUE_APP_SERVICE_API=https://service.dev.deepberry.cn
```

本地只覆盖需要联调的服务：

```dotenv
# .env.development.local
VUE_APP_UC_API=http://localhost:38010
VUE_APP_TITAN_API=http://localhost:38000
```

此时 UC、Titan 使用各自的本地端口，CMS、Admin 等未覆盖的服务继续使用统一开发入口。Pay、Next、IO 需要独立地址时配置对应变量；Next、IO 保留原有的 `/api/`、`/` 路径。

## 应用接入与认证

`js/api` 不依赖组件库、Element Plus 或应用路由。应用通过 `createApiClient()` 接入自己的 Token、错误提示和登录失效行为。例如 Titan-UC 的适配层：

```js
import { createApiClient } from "@deepberry/common/js/api";
import User from "@deepberry/titan-web-components/src/utils/user";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";

const client = createApiClient({
  getToken: (version) => User.getToken({ version }),
  onError(message, popType) {
    if (popType === "alert") ElMessageBox.alert(message, "错误");
    else if (popType === "notify") {
      ElNotification({ title: "错误", message, duration: 3000 });
    } else ElMessage({ message, type: "error" });
  },
  onUnauthorized() {
    User.destroy();
    User.toLogin();
  },
});

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
```

业务代码从应用的适配层导入请求器，才能使用这些回调。不同 `createApiClient()` 实例互不影响；创建应用实例也不会修改 common 直接导出的默认请求器。

| 接入选项                           | 默认值                 | 行为                                                                            |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `getToken(version)`                | 内置存储读取器         | 创建 Axios 实例时获取 Token；返回空值时不自动添加认证头                         |
| `onError(message, popType, error)` | 无                     | 接收错误提示内容；展示方式由应用实现                                            |
| `onUnauthorized(response)`         | 无                     | 标准响应的业务 `code < 0` 时调用；登录状态清理和跳转由应用实现                  |
| `validateResponse`                 | `true`                 | 是否检查标准响应中的业务 `code`；设为 `false` 时把响应交给调用方处理            |
| `env`                              | Vue CLI 注入的环境变量 | 覆盖该实例的环境映射，使用同名 `VUE_APP_*` 键；启用代理时须与开发服务器配置一致 |

默认使用 V2 Token，只有 IO 默认 V1。默认读取顺序为：

1. `sessionStorage.__token`。
2. `sessionStorage.TOKEN_TITAN_V2`，V1 对应 `TOKEN_TITAN`。
3. `localStorage` 中的同名 Token。

没有 Token 或无法访问存储时返回空值。默认读取器不解析 URL，也不修改存储；应用通过 `User.getToken` 保留小程序 URL Token 等现有约定。Token 在创建 Axios 实例时读取，切换账号或组织后应创建新实例。

标准请求默认 `withCredentials: false`，IO 为 `true`。`$admin` 只是服务路径名称，仍使用用户 V2 Token，不代表后台管理员身份。

## 单次请求配置

```js
$uc({ mute: true }, { timeout: 5000 });
$titan({ domain: "http://localhost:38000", headers: { "X-App": "uc" } });
```

第一个参数为封装选项，第二个参数为 Axios 配置：

| 封装选项       | 默认值         | 用途                                                                        |
| -------------- | -------------- | --------------------------------------------------------------------------- |
| `domain`       | 按 env 解析    | 覆盖后端根地址；指定后直连该地址，不走开发代理                              |
| `proxy`        | 按 env 解析    | `false` 强制直连；`true` 在开发环境请求代理路径，仍需开发服务器配置对应规则 |
| `tokenVersion` | `2`，IO 为 `1` | 显式选择 V1 或 V2 Token                                                     |
| `headers`      | 无             | 合并自定义请求头，可覆盖自动生成的 `Authorization`                          |
| `progress`     | 无             | 上传进度回调，对应 Axios 的 `onUploadProgress`                              |
| `interceptor`  | `true`         | 设为 `false` 时关闭响应拦截，包含 IO 的 `response.data` 解包                |
| `mute`         | `false`        | 不调用错误提示回调；不改变请求失败和登录失效处理                            |
| `special`      | `false`        | 允许调用方接收非零业务 `code`，并关闭该业务错误提示；负数仍触发登录失效回调 |
| `popType`      | `message`      | 传给 `onError`；应用可实现 `message`、`alert`、`notify` 等展示方式          |

第二个参数优先于默认 Axios 配置，因此 `axiosConfig.baseURL` 也能覆盖自动解析的地址。请求头按“自动认证头 → `options.headers` → `axiosConfig.headers`”合并；封装不会修改调用方传入的配置对象。

## 响应与错误

以下规则默认启用，可用 `interceptor: false` 关闭：

- 标准请求保留完整 response。后端 `code` 应为数值；当前实现对真值 `code` 进入业务错误分支，因此字符串 `"0"` 也会被当作错误。
- 业务错误默认 reject 原 response；有 `msg` 且未设置 `mute`、`special` 时，向 `onError` 传入 `[code]msg`。
- 业务 `code < 0` 时调用 `onUnauthorized`，即使设置了 `mute` 或 `special` 也会调用。
- HTTP/网络错误始终 reject 原错误，未设置 `mute` 时调用 `onError`。HTTP 401 本身不会自动触发 `onUnauthorized`，该回调只由成功 HTTP 响应中的负数业务 `code` 触发。
- `special` 只影响业务错误，不会吞掉 HTTP/网络错误。取消请求仍 reject，但不提示错误。
- IO 直接返回 `response.data`，不检查业务 `code`。关闭拦截器后返回完整 response。

组件库原先由组件处理业务 `code`，接入时使用 `validateResponse: false` 保留该行为。这也会关闭负数业务 `code` 的登录失效回调；HTTP/网络错误处理仍然生效。

## 可选开发代理

包本身默认直连 env 中的地址，跨域是否允许由后端 CORS 配置决定。需要同源转发时，在开发环境开启：

```dotenv
VUE_APP_PROXY_ENABLE=1
# 可省略，默认 /__proxy
VUE_APP_PROXY_PREFIX=/__proxy
```

在启动开发服务器的项目中配置 `vue.config.js`：

```js
const { createDevProxy } = require("@deepberry/common/js/proxy.cjs");

module.exports = {
  devServer: {
    proxy: createDevProxy(),
    port: process.env.VUE_APP_DEV_PORT || 3800,
  },
};
```

请求器与代理共用 env 和服务映射。例如 `$uc().get("user/info")` 请求 `/__proxy/uc/api/uc/user/info`，开发服务器移除 `/__proxy/uc`，再转发到 `VUE_APP_UC_API` 对应后端的 `/api/uc/user/info`。

代理只在 `NODE_ENV=development` 且目标为 HTTP(S) 地址时启用。生产构建不使用开发代理；相对根地址已经同源，也不会生成代理规则。设 `VUE_APP_PROXY_ENABLE=0` 可关闭代理，单次 `{ proxy: false }` 或指定 `domain` 也会直连。单次 `{ proxy: true }` 只改变请求地址，不会自动给开发服务器增加规则。

应用引用组件库时，使用的是应用自己的 `vue.config.js`；组件库的配置只负责它自身的独立开发。两边需要代理时都调用 `createDevProxy()`，不要再维护写死端口、`DEV_SERVER` 或 `LOCAL_*_API_TARGET`。修改 env 或代理配置后重启开发服务器。

## SSE 与 fetch

非 Axios 请求使用 `resolveServiceUrl(serviceKey, path, options?)` 解析地址。这里的 `path` 从后端根地址开始，**需要包含 `/api/xx` 前缀**：

```js
const url = client.resolveServiceUrl("cms", "/api/cms/intelligence/ask");
fetch(url, {
  headers: { Authorization: "Bearer " + User.getToken({ version: 2 }) },
});

const streamUrl = client.resolveServiceUrl(
  "cms",
  "/api/cms/wechat/mp/bind/result"
);
const absoluteUrl = new URL(streamUrl, window.location.origin);
absoluteUrl.searchParams.set("token", User.getToken({ version: 2 }));
const events = new EventSource(absoluteUrl);
```

地址解析器只生成 URL，不添加认证、不安装响应拦截器；调用方按接口约定自行处理。它与 Axios 共用地址选择和代理规则。此封装及代理覆盖 HTTP 请求，SignalR/WebSocket 仍由应用配置。

## 旧版迁移

旧文档已合并到本页。旧运行时入口 `js/https.js`、`js/interceptors.js` 暂时保留，供其他应用逐步迁移；不再从这些入口新增调用。仓库不存在 `js/axios.js`，旧文档中的这个导入路径有误。

| 旧调用或约定                        | 当前写法或需要核对的差异                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@deepberry/common/js/https`        | 改用 `@deepberry/common/js/api`，或应用接好回调后的适配层                                      |
| 旧 `$titan2`、应用 `$serviceTitan`  | 统一为 `$titan`                                                                                |
| 应用 `$serviceAdmin`                | 统一为 `$admin`                                                                                |
| 应用或组件库 `$service`             | 统一为 `$cms`                                                                                  |
| 旧 common 的 `$cms`                 | 原先基于 Basic Auth / `localStorage.token`；新接口默认 V2 Bearer Token，迁移前确认后端认证合同 |
| 旧 `$cms` 默认携带 Cookie           | 新标准请求默认 `withCredentials: false`；确需跨域 Cookie 时通过第二个参数显式设置              |
| 旧 common 的 `$cms`、`$titan2` 地址 | 原先使用 `data/common.json` 的域名或 `options.domain`；新接口使用 env，并自动添加服务前缀      |
| 旧调用传完整 `/api/xx/...`          | 新 Axios 实例只传服务内路径；`resolveServiceUrl` 仍传完整路径                                  |
| 旧接口内置 Element Plus 提示        | 新接口通过 `onError` 接入 UI；未配置时不会弹窗                                                 |
| 旧 `$titan2` 原样返回业务响应       | 新接口默认检查业务 `code`；需要逐步迁移时可创建 `validateResponse: false` 的实例               |

`titan-web-components` 保留 `$titan2`、`$service` 两个公开兼容别名；common 的新入口只导出标准服务名。旧调用确实需要 V1 Token 时，显式传入 `{ tokenVersion: 1 }`。

## 兄弟仓库迁移指南

以 Titan-UC 的接入方式为基准：common 负责 HTTP 地址、认证头和通用响应规则；应用的 `src/utils/api.js` 或 `api.ts` 只接入登录、提示及自身的特殊行为；业务模块统一从 `@/utils/api` 导入。下面是迁移实施步骤，不代表兄弟仓库已经完成改造。

### 1. 盘点原有调用与行为

先检查目标仓库的工作区状态，再搜索请求器、拦截器、环境地址和流式请求。以下命令在目标应用根目录执行：

```sh
git status --short
rg -n 'common/js/(https|api)|utils/(api|interceptors)|axios\.create|VUE_APP_.*(API|WS)|EventSource|fetchEventSource|fetch\(' src
rg -n 'DEV_SERVER|LOCAL_.*API_TARGET|proxy|target|NODE_ENV|--mode' vue.config.js package.json
rg --files --hidden -g '.env*' -g '!node_modules' -g '!.git' -g '!dist' -g '!tmp'
```

记录每类请求的后端路径、Token 版本、返回数据层级、错误提示和登录失效行为。不要仅凭函数名替换：旧 `$cms` 在不同仓库可能使用 Basic Auth、V1 或 V2 Token；带 `user`、`account` 的路径也不一定属于 UC，须保持实际后端归属。

### 2. 安装已发布依赖

Titan-UC 本轮使用 `@deepberry/common@0.3.15` 和 `@deepberry/titan-web-components@2.0.7`。这是本指南的参考版本组合，后续可以使用已验证兼容的新版本。

```sh
npm install '@deepberry/common@^0.3.15' '@deepberry/titan-web-components@^2.0.7'
npm ls @deepberry/common @deepberry/titan-web-components
```

按仓库原有包管理器维护依赖和锁文件，确认应用与组件库实际安装的 common 都包含 `js/api`、`js/proxy.cjs`。只升级应用内的请求器、保留旧组件包，会使 Header、组织切换、AI 等组件内部继续走旧逻辑。不要依赖本机软链作为交付结果；验收时使用正常安装的包。若从组件库 1.x 升到 2.x，另需验证当前应用使用的组件接口及页面行为。

### 3. 将应用请求器改为适配层

将上文[应用接入与认证](#应用接入与认证)的 `createApiClient()` 示例放入目标应用的 `src/utils/api.js`，或保留原有 `.ts` 文件。Titan-UC 使用 `.ts`，它在 `User.getToken({ version })` 后加了 `as string`；JS 项目无需复制类型断言。

- 接入本应用的 `getToken`、`onError` 和 `onUnauthorized`，不再逐个服务复制 `axios.create()`、域名拼接和标准拦截器。
- 应用沿用 Titan-UC 的默认业务 `code` 校验。组件库的 `validateResponse: false` 是其内部兼容策略，不要直接复制到应用，否则业务错误和登录失效处理会改变。
- 保留仍在使用的 `$ios`、`$nexts`、`SSE` 等应用能力。common 的 HTTP 请求器不替代 SignalR/WebSocket，也不导出这些类或函数。
- 先迁出旧拦截器里的应用专有行为，再删除无人引用的安装函数或文件；保留仍被页面导入的错误文案工具。不要同时安装旧、新两套响应拦截器。

### 4. 收拢 env 和开发代理

以一个应用的独立开发环境为例：

```dotenv
# .env.development：统一开发入口；开启代理时由本应用的 Vue CLI 服务转发。
VUE_APP_SERVICE_API=https://service.dev.deepberry.cn
VUE_APP_PROXY_ENABLE=1
```

```dotenv
# .env.development.local：只覆盖正在联调的服务，此文件不提交。
VUE_APP_UC_API=http://localhost:38010
VUE_APP_TITAN_API=http://localhost:38000
```

```dotenv
# .env.production：由线上网关按 /api/xx 分流。
VUE_APP_SERVICE_API=https://service.deepberry.cn
```

`38010`、`38000` 是 Titan-UC 本轮联调的 UC、Titan 后端端口，迁移时以本机实际服务配置为准。未覆盖的服务继续使用统一入口。已有 Pay、Next、IO 独立地址按环境保留；它们的服务专用变量优先于 `VUE_APP_SERVICE_API`。同样，原有 `VUE_APP_CMS_API`、`VUE_APP_TITAN_API` 等若仍有值，会覆盖统一网关；希望走统一入口时需移除这些旧值。

本地后端地址放 `.env.development.local`，不要放所有 mode 都加载的 `.env.local`。同名值的优先级为：启动进程已有环境变量 → `.env.[mode].local` → `.env.[mode]` → `.env.local` → `.env`。

在目标应用自己的 `vue.config.js` 中引入 `createDevProxy()`，按上文[可选开发代理](#可选开发代理)替换普通 API 转发规则，保留原有的端口、静态资源、样式与构建配置。特殊代理先核对调用方和附加行为，不要整段删除。清理重复的 `DEV_SERVER`、`LOCAL_*_API_TARGET` 和旧服务端口配置后，重启开发服务器。

同时核对 `package.json`，**加载哪个 env 由 `--mode` 决定，是否启用代理由 `NODE_ENV` 和代理开关共同决定**：

| 启动或构建方式                                     | 应有的行为                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `serve --mode development`                         | 加载 development 配置，开发运行时，可使用代理                                            |
| `NODE_ENV=development ... serve --mode production` | 本地开发服务器连接正式服务；不是正式构建，也不加载 development.local                     |
| `serve --mode preview`                             | 加载 preview 配置；默认仍是开发运行时，不自动等同于 production                           |
| `build --mode production`                          | 正式构建，关闭开发代理，使用线上网关及本应用的静态资源路径                               |
| `build --mode development/preview`                 | 如需生成发布产物，应显式设置 `NODE_ENV=production`，避免把 `/__proxy` 请求地址编入发布包 |
| 原有 `debug --mode staging`                        | 仍读取 staging 配置；要改为 development，需同步改脚本，不能只删除旧 env 文件             |

### 5. 迁移业务调用和流式地址

业务导入继续指向 `@/utils/api`，不要绕过应用回调直接导入 common 的默认实例。常见映射如下，Token 版本按盘点结果保留：

| 原调用                                          | 迁移后                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `$serviceTitan()`、`$titan2()`                  | `$titan()`                                                          |
| `$serviceAdmin()`                               | `$admin()`                                                          |
| V2 的 `$service()`、`$serviceCms()`、`$cms2()`  | `$cms()`                                                            |
| 原先使用 V1 的应用 `$cms(options)`              | `$cms({ ...options, tokenVersion: 1 })`，待后端确认后再升级认证版本 |
| `$uc()`、`$erp()`、`$pay()`、`$next()`、`$io()` | 保留服务名，对照新实现核对配置和返回值                              |

例如 greenhouse 的 `/api/titan/sensor/dashboard` 仍归 Titan，只替换工厂名：

```js
import { $titan } from "@/utils/api";

export function getDashboard(id) {
  return $titan().get(`/sensor/dashboard/${id}`);
}
```

Axios 方法只传服务内路径，不再包含 `/api/titan`。标准请求继续返回完整 response，IO 默认只返回响应体；不要在全仓库机械增加或删除 `.data`。保留上传进度、自定义 headers、超时、取消请求及 `mute`、`special` 等已有选项，并按本文语义验证。

聊天、TTS、微信绑定等绕过 Axios 的 URL 也要迁移，避免只有普通请求能走本地服务。例如 greenhouse 的聊天地址可以写成：

```js
import { resolveServiceUrl } from "@/utils/api";

export const fetchAskUrl = resolveServiceUrl(
  "cms",
  "/api/cms/intelligence/ask"
);
export const fetchAskFerUrl = resolveServiceUrl(
  "erp",
  "/api/erp/erp/fertilizer/ai/ask"
);
```

这里要传完整后端路径；第二个示例中的 `/api/erp/erp/` 来自现有接口路径，不要当作重复前缀删掉。`fetch` / `fetchEventSource` 仍自行传认证头；原生 EventSource 按接口要求携带 Token，并用 `new URL(url, window.location.origin)` 兼容相对代理地址。保留关闭连接、取消请求和重连行为。

### 6. greenhouse 需要额外保留的行为

以下差异来自编写本指南时对 greenhouse 的检查（2026-10-15），实际实施时需重新核对：

- `src/service/tasks.ts` 使用旧 V1 `$cms`；`$cms2`、`$serviceCms` 使用 V2。迁移时不能把所有 CMS 调用直接变成默认 V2。
- `src/utils/interceptors.js` 根据 `i18n_key`、`i18n_args` 翻译业务错误，`getApiErrorMessage` 还被灌溉页面直接导入。应保留这些文案工具，并在新 `onError(message, popType, error)` 中接入翻译；业务错误的响应体在 `error.data`，HTTP 错误的响应体在 `error.response.data`。
- common 0.3.15 的业务错误分支要求有 `msg` 才调用 `onError`。如果接口只返回 `i18n_key`，仅配置回调仍不足以保留翻译提示；需先在 common 补齐回调能力和测试、发布新版本，或明确保留应用侧的对应适配，再移除旧逻辑。
- 灌溉请求存在 `{ special: true }`。旧 greenhouse 拦截器在此选项下跳过负数业务码的退出登录，新 common 仍调用 `onUnauthorized`；迁移时明确采用哪种行为，并验证表单对业务错误的处理。
- `vue.config.js` 的 `/api/camera` 代理还清空了 `origin` 请求头。这不是普通请求器映射，需核对播放器的调用方式并保留必要行为；仅换成 `createDevProxy()` 不会自动复制此规则。
- `$ios`、`$nexts` 及 `VUE_APP_IO_WS`、`VUE_APP_NEXT_WS` 在 greenhouse 中仍被使用，需保留并验证设备状态与灌溉连接。组件库独立调试页中没有使用的变量，不代表业务应用也可以删除。

### 7. 验收并交付

可对照 Titan-UC 以下文件的改造职责，按目标仓库调整，不整份复制构建配置：

| Titan-UC 文件                                                                           | 对照内容                                                      |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/utils/api.ts`                                                                      | 应用回调、服务导出，以及保留的 SignalR/SSE                    |
| `src/service/account.ts`、`src/service/chat.js`                                         | 按服务导入、Axios 路径与流式 URL                              |
| `src/views/account/wechat/WechatBind.vue`、`src/views/user/components/WechatDialog.vue` | SSE 地址、Token 与连接生命周期                                |
| `vue.config.js`、`.env.development`                                                     | 统一代理入口与开发环境；本机 local 文件需自行建立             |
| `tests/api.test.cjs`                                                                    | 应用/已安装组件包一致性、错误行为、SSE 和实际本地代理转发测试 |
| `docs/agents/请求器.md`                                                                 | 应用内约定及后续维护边界                                      |

完成标准：

- 重新搜索旧请求器名、`common/js/https`、直接拼接 `VUE_APP_*_API` 和旧拦截器引用，逐项确认；有意保留的兼容调用写明原因。
- 确认应用和已安装组件包对同一服务生成相同地址、使用预期 Token；分别验证代理开启、直连、本地覆盖和未覆盖服务的回退。
- 验证成功响应、正数/负数业务码、HTTP/网络错误、取消请求、`mute`、`special`，以及需要保留的多语言提示。
- 运行目标应用的相关测试、lint 和正式构建。可借鉴 Titan-UC 的接入测试，但需要替换应用特有导入和场景；单独通过 common 测试不代表应用集成通过。
- 在已登录的实际页面检查读取、保存、组织切换后的 Token、组件库请求，以及用到的 SSE/上传/SignalR；失败或未执行的场景单独列出，不能用构建成功代替联调结果。
- 交付应用代码、env 示例、依赖及仓库跟踪的锁文件，并在 `docs/agents` 记录本仓特殊约定；不提交本机 `.local` 文件。仅使用已发布接口时无需重复发 common/组件包；若扩展公共能力，先测试发包，再更新应用依赖并验收。

## 验证

在 common 仓库运行 `npm test`，覆盖服务地址、开发代理、Token、响应兼容、网络错误及真实本地 HTTP 请求。发包流程先运行这些测试。接入应用后，还应检查该应用的环境加载、正式构建与业务认证流程。
