/*
 * @Author: iRuxu
 * @Date: 2022-07-08 17:22:08
 * @LastEditTime: 2022-07-08 18:50:26
 * @Description:常用工具方法
 *
 */

import common from "../data/common.json";

/**
 * @description: 构建图片链接
 *
 * @param {*} path
 * @param {boolean} [useCdn=false]
 * @return {*} 
 */
const getImgLink = function (path, useCdn = false) {
    if (useCdn) {
        return `${common.__cdn}img${path}`;
    } else {
        return `${common.__img}${path}`;
    }
};
/**
 * @description: 构建CDN链接
 *
 * @param {string} path 相对路径
 * @param {string|array|number} size
 * @return {string} 
 */
function getCdnLink(path, size) {
    if (path) {
        let url = `${common.__cdn}${path}`;
        return (url += buildOssSuffix(size));
    } else {
        return path;
    }
};
/**
 * @description: 构建oss图片后缀
 *
 * @param {string|array|number} size
 * @return {string} 
 */
function buildOssSuffix(size) {
    let suffix = "";
    if (size) {
        // 长宽不一致
        if (Array.isArray(size)) {
            suffix = `?x-oss-process=image/auto-orient,1/resize,m_fill,w_${size[0]},h_${size[1]}/quality,Q_100`;
            // 预设style
        } else if (isNaN(size)) {
            suffix = `?x-oss-process=style/${size}`;
            // 长宽一致
        } else {
            suffix = `?x-oss-process=image/auto-orient,1/resize,m_fill,w_${size},h_${size}/quality,Q_100`;
        }
    }
    return suffix;
}

export { getImgLink, getCdnLink, buildOssSuffix };
