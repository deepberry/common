import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApiClient } from "../js/api.js";
import proxy from "../js/proxy.cjs";

const env = {
  NODE_ENV: "development",
  VUE_APP_SERVICE_API: "https://service.dev.deepberry.cn/",
  VUE_APP_UC_API: "http://localhost:38010/",
  VUE_APP_TITAN_API: "http://localhost:38000",
};
const adapter = (data) => async (config) => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});

test("独立服务地址优先，其他服务回退统一域名，自动规范末尾斜杠", () => {
  const client = createApiClient({ env });
  assert.equal(
    client.$uc().getUri({ url: "user/info" }),
    "http://localhost:38010/api/uc/user/info"
  );
  assert.equal(
    client.$titan().getUri({ url: "/organization" }),
    "http://localhost:38000/api/titan/organization"
  );
  assert.equal(
    client.$cms().defaults.baseURL,
    "https://service.dev.deepberry.cn/api/cms/"
  );
  assert.equal(
    client.$admin().defaults.baseURL,
    "https://service.dev.deepberry.cn/api/admin/"
  );
  assert.equal(
    client.$erp().defaults.baseURL,
    "https://service.dev.deepberry.cn/api/erp/"
  );
});

test("线上统一域名及专用 Pay、Next、IO 地址保留原有路径", () => {
  const client = createApiClient({
    env: {
      NODE_ENV: "production",
      VUE_APP_PROXY_ENABLE: "1",
      VUE_APP_SERVICE_API: "https://service.deepberry.cn",
      VUE_APP_PAY_API: "https://pay.deepberry.cn/",
      VUE_APP_NEXT_API: "https://next.deepberry.cn/",
      VUE_APP_IO_API: "https://io.deepberry.cn/",
    },
  });
  assert.equal(
    client.$uc().defaults.baseURL,
    "https://service.deepberry.cn/api/uc/"
  );
  assert.equal(
    client.$titan().defaults.baseURL,
    "https://service.deepberry.cn/api/titan/"
  );
  assert.equal(
    client.$pay().defaults.baseURL,
    "https://pay.deepberry.cn/api/pay/"
  );
  assert.equal(
    client.$next().defaults.baseURL,
    "https://next.deepberry.cn/api/"
  );
  assert.equal(client.$io().defaults.baseURL, "https://io.deepberry.cn/");
});

test("请求器和开发代理共享服务映射，只移除代理前缀，保留 API 路径和查询参数", () => {
  const proxyEnv = {
    ...env,
    VUE_APP_PROXY_ENABLE: "1",
    VUE_APP_PROXY_PREFIX: "/dev-api/",
  };
  const client = createApiClient({ env: proxyEnv });
  const rules = proxy.createDevProxy(proxyEnv);
  for (const [key, path, target] of [
    ["uc", "/api/uc/user/info?lang=zh", "http://localhost:38010"],
    ["titan", "/api/titan/organization", "http://localhost:38000"],
    [
      "cms",
      "/api/cms/wechat/mp/bind/result?token=example",
      "https://service.dev.deepberry.cn",
    ],
  ]) {
    const url = client.resolveServiceUrl(key, path);
    assert.equal(url, `/dev-api/${key}${path}`);
    assert.equal(rules[`/dev-api/${key}`].target, target);
    assert.equal(rules[`/dev-api/${key}`].pathRewrite(url), path);
  }
  assert.equal(client.$uc().defaults.baseURL, "/dev-api/uc/api/uc/");
});

test("代理关闭及生产构建不生成代理规则", () => {
  assert.deepEqual(proxy.createDevProxy(env), {});
  assert.deepEqual(
    proxy.createDevProxy({ ...env, VUE_APP_PROXY_ENABLE: "0" }),
    {}
  );
  assert.deepEqual(
    proxy.createDevProxy({
      ...env,
      NODE_ENV: "production",
      VUE_APP_PROXY_ENABLE: "1",
    }),
    {}
  );
});

test("显式 domain 与 proxy:false 可以直连，不被代理吞掉", () => {
  const client = createApiClient({
    env: { ...env, VUE_APP_PROXY_ENABLE: "1" },
  });
  assert.equal(
    client.$uc({ domain: "http://localhost:40000/" }).defaults.baseURL,
    "http://localhost:40000/api/uc/"
  );
  assert.equal(
    client.$uc({ proxy: false }).defaults.baseURL,
    "http://localhost:38010/api/uc/"
  );
});

test("相对根地址保持同源且不会生成无效代理", () => {
  const relativeEnv = {
    NODE_ENV: "development",
    VUE_APP_SERVICE_API: "/",
    VUE_APP_PROXY_ENABLE: "1",
  };
  const client = createApiClient({ env: relativeEnv });
  assert.equal(client.$uc().defaults.baseURL, "/api/uc/");
  assert.deepEqual(proxy.createDevProxy(relativeEnv), {});
});

test("Token 默认使用 V2，IO 使用 V1，新实例读取当前 Token", () => {
  let token = "first";
  const client = createApiClient({
    env,
    getToken: (version) => `${token}-${version}`,
  });
  assert.equal(client.$uc().defaults.headers.Authorization, "Bearer first-2");
  assert.equal(client.$io().defaults.headers.Authorization, "Bearer first-1");
  token = "second";
  assert.equal(
    client.$titan().defaults.headers.Authorization,
    "Bearer second-2"
  );
  assert.equal(
    client.$titan({ tokenVersion: 1 }).defaults.headers.Authorization,
    "Bearer second-1"
  );
  assert.equal(client.$uc().defaults.withCredentials, false);
  assert.equal(client.$io().defaults.withCredentials, true);
});

test("调用方 Axios 配置优先且不修改原始对象", () => {
  const client = createApiClient({ env, getToken: () => "token" });
  const config = {
    timeout: 123,
    withCredentials: true,
    headers: { Authorization: "Custom", "X-Test": "yes" },
  };
  const before = structuredClone(config);
  const instance = client.$uc(
    { headers: { "X-App": "uc" }, progress: () => {} },
    config
  );
  assert.equal(instance.defaults.timeout, 123);
  assert.equal(instance.defaults.headers.Authorization, "Custom");
  assert.equal(instance.defaults.headers["X-App"], "uc");
  assert.equal(instance.defaults.withCredentials, true);
  assert.equal(typeof instance.defaults.onUploadProgress, "function");
  assert.deepEqual(config, before);
});

test("标准响应保留 Axios 包装，IO 返回原始 data", async () => {
  const client = createApiClient({ env });
  const data = { code: 0, data: { id: 1 } };
  assert.equal(
    (await client.$uc({}, { adapter: adapter(data) }).get("user/info")).data,
    data
  );
  assert.equal(
    await client.$io({}, { adapter: adapter(data) }).get("info"),
    data
  );
});

test("业务错误提示、mute、special 与未登录回调保留原有语义", async () => {
  const messages = [];
  let unauthorized = 0;
  const client = createApiClient({
    env,
    onError: (message) => messages.push(message),
    onUnauthorized: () => unauthorized++,
  });
  await assert.rejects(
    client
      .$uc({}, { adapter: adapter({ code: 403, msg: "无权访问" }) })
      .get("user/info")
  );
  assert.deepEqual(messages, ["[403]无权访问"]);
  await assert.rejects(
    client
      .$uc({ mute: true }, { adapter: adapter({ code: -1, msg: "登录失效" }) })
      .get("user/info")
  );
  assert.equal(messages.length, 1);
  assert.equal(unauthorized, 1);
  const special = await client
    .$uc(
      { special: true },
      { adapter: adapter({ code: 403, msg: "无权访问" }) }
    )
    .get("user/info");
  assert.equal(special.data.code, 403);
  assert.equal(messages.length, 1);
});

test("公共组件兼容模式及 interceptor:false 不改变原有响应处理", async () => {
  const client = createApiClient({ env, validateResponse: false });
  assert.equal(
    (await client.$uc({}, { adapter: adapter({ code: -1 }) }).get("user/info"))
      .data.code,
    -1
  );
  const standard = createApiClient({ env });
  assert.equal(
    (
      await standard
        .$uc({ interceptor: false }, { adapter: adapter({ code: 403 }) })
        .get("user/info")
    ).data.code,
    403
  );
});

test("网络异常保留原始错误，不因缺少 response 再抛 TypeError", async () => {
  const errors = [];
  const failure = new Error("Network Error");
  const client = createApiClient({
    env,
    onError: (message) => errors.push(message),
  });
  await assert.rejects(
    client
      .$uc(
        {},
        {
          adapter: async () => {
            throw failure;
          },
        }
      )
      .get("user/info"),
    (error) => error === failure
  );
  assert.deepEqual(errors, ["Network Error"]);
});

test("取消请求不弹出错误提示", async () => {
  const errors = [];
  const client = createApiClient({
    env,
    onError: (message) => errors.push(message),
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    client
      .$uc({}, { signal: controller.signal, adapter: adapter({ code: 0 }) })
      .get("user/info")
  );
  assert.equal(errors.length, 0);
});

test("真实 HTTP 请求到达独立端口并保留服务路径、查询参数和认证头", async (t) => {
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        code: 0,
        url: req.url,
        authorization: req.headers.authorization,
      })
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const client = createApiClient({
    env: {
      ...env,
      VUE_APP_UC_API: `http://127.0.0.1:${server.address().port}`,
    },
    getToken: () => "test-token",
  });
  const response = await client
    .$uc({}, { proxy: false })
    .get("user/info", { params: { lang: "zh" } });
  assert.equal(response.data.url, "/api/uc/user/info?lang=zh");
  assert.equal(response.data.authorization, "Bearer test-token");
});
