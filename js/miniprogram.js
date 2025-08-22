import wx from "weixin-js-sdk";

/**
 * 判断当前网页是否在小程序环境打开
 */
export function isMiniProgram() {
  return navigator.userAgent.toLowerCase().includes("miniprogram");
}

export function serializeParams(params) {
  return Object.keys(params)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join("&");
}

/**
 * 用于微信小程序的页面跳转,避免在同一个页面中跳转
 */
export function wxNewPage(target) {
  const [path, queryString] = target.split("?");

  const query = queryString
    ? Object.fromEntries(new URLSearchParams(queryString))
    : {};

  query.path = path;

  const url = "/pages/webview/webview?" + serializeParams(query);

  wx.miniProgram.navigateTo({
    url,
  });
}

export function mobileOpen(target) {
  if (isMiniProgram()) {
    console.log(target);
    wxNewPage(target);
  } else {
    location.href = target;
  }
}
