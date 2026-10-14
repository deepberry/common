// 浏览器请求器和开发服务器共用同一份服务地址规则。
const services = Object.freeze({
  uc: { env: "VUE_APP_UC_API", path: "/api/uc/" },
  titan: { env: "VUE_APP_TITAN_API", path: "/api/titan/" },
  cms: { env: "VUE_APP_CMS_API", path: "/api/cms/" },
  admin: { env: "VUE_APP_ADMIN_API", path: "/api/admin/" },
  erp: { env: "VUE_APP_ERP_API", path: "/api/erp/" },
  pay: { env: "VUE_APP_PAY_API", path: "/api/pay/" },
  next: { env: "VUE_APP_NEXT_API", path: "/api/" },
  io: { env: "VUE_APP_IO_API", path: "/", tokenVersion: 1, simple: true },
});

function normalizeDomain(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function resolveDomain(serviceKey, env, options = {}) {
  if (!services[serviceKey]) throw new Error(`未知服务：${serviceKey}`);
  return normalizeDomain(
    options.domain || env[services[serviceKey].env] || env.VUE_APP_SERVICE_API
  );
}

function proxyEnabled(env, options = {}) {
  if (
    env.NODE_ENV !== "development" ||
    options.proxy === false ||
    options.domain
  )
    return false;
  return (
    options.proxy === true ||
    /^(1|true|yes|on)$/i.test(String(env.VUE_APP_PROXY_ENABLE || "").trim())
  );
}

function proxyBase(serviceKey, env) {
  const prefix =
    String(env.VUE_APP_PROXY_PREFIX || "/__proxy")
      .trim()
      .replace(/^\/+|\/+$/g, "") || "__proxy";
  return `/${prefix}/${serviceKey}`;
}

function resolveServiceUrl(serviceKey, path, env, options = {}) {
  const domain = resolveDomain(serviceKey, env, options);
  // 相对地址已经同源，无需额外转发。
  const base =
    proxyEnabled(env, options) && /^https?:\/\//i.test(domain)
      ? proxyBase(serviceKey, env)
      : domain;
  return base + (path ? `/${String(path).replace(/^\/+/, "")}` : "");
}

module.exports = {
  services,
  resolveDomain,
  proxyEnabled,
  proxyBase,
  resolveServiceUrl,
};
