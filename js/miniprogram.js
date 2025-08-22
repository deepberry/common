import wx from "weixin-js-sdk";

/**
 * 判断当前网页是否在小程序环境打开
 */
export function isMiniProgram() {
  return navigator.userAgent.toLowerCase().includes("miniprogram");
}

export function miniprogramHack() {
  document.addEventListener("DOMContentLoaded", function () {
    // 检查 html 标签是否有 wechat-miniprogram 类
    if (document.documentElement.classList.contains("wechat-miniprogram")) {
      // 为整个 document 添加一个点击事件监听器
      document.addEventListener("click", function (event) {
        // 检查被点击的元素是否是一个链接
        if (event.target.tagName === "A") {
          var href = event.target.getAttribute("href");

          // 检查是否是相对链接
          var isRelative =
            !href.startsWith("http://") &&
            !href.startsWith("https://") &&
            !href.startsWith("//");

          // 检查是否是deepberry域名
          var isDBDomain = /deepberry\.cn/.test(href);

          // 如果不是相对链接且不是deepberry域名
          if (!isRelative && !isDBDomain) {
            // 阻止默认行为
            event.preventDefault();
          }
        }
      });
    }
  });
}

// 从url中获取参数
export function getUrlParam(name) {
  var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  var r = window.location.search.substr(1).match(reg);
  return r ? decodeURIComponent(r[2]) : null;
}

export function getTokenFromUrl() {
  const token = sessionStorage.getItem("__token");

  if (token) {
    return token;
  }

  const __token = getUrlParam("__token");

  if (__token) {
    sessionStorage.setItem("__token", __token);
    return __token;
  }
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
