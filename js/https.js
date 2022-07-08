/*
 * @Author: iRuxu
 * @Date: 2022-06-16 18:32:38
 * @LastEditTime: 2022-07-08 17:14:06
 * @Description: 通用请求器
 */

import { installInterceptors, installStandardInterceptors } from "./interceptors.js";
import { __cms } from "../data/common.json";
import axios from "axios";

// cms通用请求接口
function $cms(options) {
    let domain = (options && options.domain) || __cms;
    let config = {
        // 同时发送cookie和basic auth
        withCredentials: true,
        auth: {
            username: (localStorage && localStorage.getItem("token")) || "",
            password: "cms common request",
        },
        baseURL: process.env.NODE_ENV === "production" ? domain : "/",
        headers: {},
    };

    // 创建实例
    const ins = axios.create(config);

    // 指定拦截器
    installStandardInterceptors(ins, options);

    return ins;
}

export { $cms };
