/*
 * @Author: iRuxu
 * @Date: 2022-06-16 18:33:46
 * @LastEditTime: 2022-06-20 15:37:39
 * @Description: 拦截器
 */

import { ElMessage, ElMessageBox, ElNotification } from "element-plus";

function loadPop(msg, popType = "message") {
    switch (popType) {
        case "message":
            ElMessage({
                message: msg,
                type: "error",
            });
            break;
        case "alert":
            ElMessageBox.alert(msg, "错误");
            break;
        case "notify":
            ElNotification({
                title: "错误",
                message: msg,
                duration: 3000,
            });
            break;
        default:
            break;
    }
}

function throwError(err) {
    console.log(err.response);
    return Promise.reject(err);
}

/**
 * 无包装器的拦截器
 *
 * @param {*} target
 * @param {*} options
 */
function installInterceptors(target, options) {
    target["interceptors"]["response"].use(
        function (response) {
            return response;
        },
        function (err) {
            return throwError(err);
        }
    );
}

/**
 * 标准统一包装模式
 *
 * @param {*} target
 * @param {*} options
 */
function installStandardInterceptors(target, options) {
    let popType = options && options.popType || 'message'
    target["interceptors"]["response"].use(
        function (response) {
            if (response.data.code) {
                if(!options || !options.mute){
                    response.data.msg && loadPop(`[${response.data.code}]${response.data.msg}`,popType);
                }
                return Promise.reject(response);
            }
            return response;
        },
        function (err) {
            if(!options || !options.mute){
                if(err.response && err.response.data && err.response.data.msg){
                    loadPop(err.response.data.msg,popType);
                }else{
                    loadPop('请求异常，请稍后重试',popType);
                }
            }
            return throwError(err)
        }
    );
}

export { installInterceptors, installStandardInterceptors,loadPop };
