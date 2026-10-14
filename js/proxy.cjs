const {
  services,
  resolveDomain,
  proxyEnabled,
  proxyBase,
} = require("./api-config.cjs");

function createDevProxy(env = process.env) {
  if (!proxyEnabled(env)) return {};
  return Object.fromEntries(
    Object.keys(services).flatMap((serviceKey) => {
      const target = resolveDomain(serviceKey, env);
      if (!/^https?:\/\//i.test(target)) return [];
      const context = proxyBase(serviceKey, env);
      return [
        [
          context,
          {
            target,
            changeOrigin: true,
            pathRewrite: (path) => path.slice(context.length) || "/",
          },
        ],
      ];
    })
  );
}

module.exports = { createDevProxy };
