# 统一请求封装

## $cms
请求cms接口

### Basic
```js
import {$cms} from '@deepberry/common/js/axios.js
$cms(options).get('/api/path/to')
```

### Options
cms返回一个包装过的axios实例，已装载拦截器，默认使用error pop。  
可以给cms指定选项来覆盖部分设定。
+ **popType** : 可选值`message`(默认)、`alert`(重要警告),`notify`(可忽略的警告)
+ **mute** : 可选值`false`（默认）、`true`（不要弹出pop）
+ **domain** : 覆盖当前的域名与端口，应传入`host:port`