/*
 * @Author: iRuxu
 * @Date: 2022-07-08 17:22:08
 * @LastEditTime: 2022-07-08 17:25:12
 * @Description: 
 * 
 */

import common from '../data/common.json'


export const getCdnLink = function(path) {
    return `${common.cdn}${path}`
}

export const getImgLink = function(path) {
    return `${common.img}${path}`
}