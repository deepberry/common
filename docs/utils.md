# 常用工具方法

### [getImgLink]('../js/utils')(url,useCdn=false) 获取图片链接
使用全局的img.deepberry.cn域名衔接各个静态图片资源库路径
所有`img-$project`项目使用上方域名，统一部署在前端服务器，按目录重写nginx转发，同时可通过cdn域名访问。
```javascript
// 1.不使用cdn
getImgLink(path) 
// => https://img.deepberry.cn/$project/path/to

// 2.使用cdn
getImgLink(path,true)
// => https://cdn.deepberry.cn/img/$project/path/to
```

### [getCdnLink]('../js/utils#L15')(path,size) 图片OSS通用处理
- 为空时不会处理，会返回空字符串（没有默认头像、需自行本地处理为空时返回值）
- 第2个参数可指定oss处理规则，可返回方形(传递单数字)或者指定任意居中剪裁尺寸(传递数组)或指定任意预设样式(传递字符串)
```javascript
// 1.设置一个指定数字方形 
getCdnLink(path,100) 
// => https://cdn.deepberry.cn/path/to/pic.jpg?x-oss-process=image/auto-orient,1/resize,m_fill,w_100,h_100/quality,Q_100

// 2.设置指定宽高长方形（等比缩放后居中剪裁）
getCdnLink(path,[180,100])
// => https://cdn.deepberry.cn/path/to/pic.jpg?x-oss-process=image/auto-orient,1/resize,m_fill,w_180,h_100/quality,Q_100

// 3.设置指定预设oss样式（cms通用栏目目前预设为mini_banner:168*88)
getCdnLink(path,'mini_banner')
// => https://cdn.deepberry.cn/path/to/pic.jpg?x-oss-process=style/mini_banner
```

### [buildOssSuffix]('../js/utils') OSS后缀处理规则
