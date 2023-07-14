/*
 * @Author: iRuxu
 * @Date: 2022-06-16 18:32:38
 * @LastEditTime: 2022-07-13 18:27:30
 * @Description: 通用请求器
 */

import { installInterceptors, installStandardInterceptors } from "./interceptors.js";
import Common from "../data/common.json";
import axios from "axios";

// cms通用请求接口
function $cms(options) {
    let domain = (options && options.domain) || Common.__cms;
    let config = {
        // 同时发送cookie和basic auth
        withCredentials: true,
        baseURL: process.env.NODE_ENV === "production" ? domain : "/",
        headers: options?.headers || {},
    };

    if (options?.auth) {
        config.auth = options?.auth;
    }

    if (!options?.headers.Authorization) {
        config.auth = {
            username: "cms common request",
            password: (localStorage && localStorage.getItem("token")) || "",
        };
    }

    // 创建实例
    const ins = axios.create(config);

    // 指定拦截器
    installStandardInterceptors(ins, options);

    return ins;
}

// titan2通用请求接口
function $titan2(options) {
    let domain = (options && options.domain) || Common.__titan2;

    let config = {
        baseURL: process.env.NODE_ENV === "production" ? domain : "/",
        withCredentials: false,
        headers: {
            Authorization: "Bearer " + User.getToken({ version: 2 }),
        },
    }

    const ins = axios.create(config);

    installInterceptors(ins, options);

    return ins;
}

export { $cms, $titan2 };
