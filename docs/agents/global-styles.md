# Web 应用全局样式

`@deepberry/common/css/global.less` 是 Web 应用的统一全局样式入口，包含颜色变量、断点变量、基础 reset 和 `common.less` 中的通用规则。字体平滑统一在 `common.less` 的 `body` 上设置，`text-rendering` 沿用 `reset.css` 的设置。

每个应用在 `main.js` / `main.ts` 的开头引入一次，先加载公共基础样式，再加载应用自己的样式：

```js
import "@deepberry/common/css/global.less";

// 后续照常导入 App.vue、应用样式及业务模块。
```

独立导入使公共样式成为单独的 Less 编译单元，避免其中的 `@primary`、断点等变量覆盖应用样式通过构建配置注入的主题变量。也可在 `App.vue` 中使用单独的非 `scoped` 样式块引入 `global.less`，与应用自己的样式块分开。保留应用原有的额外 reset；common 的 reset 不替代其全部规则。

- 不在各个业务组件或公共组件里重复引入 `global.less`；公共组件继承宿主页面的全局样式。
- 不把 `global.less` 放入 `style-resources-loader` 或 Vite `additionalData`，否则会在每个样式文件中重复输出基础 CSS。需要自动注入变量时，只注入 `color.less`、`var.less` 或应用自己的纯变量/mixin 文件。
- `titan-web-components` 的独立预览通过 `src/main.ts` 引入，Storybook 通过 `.storybook/preview.js` 引入；使用组件库的 UC 及其他应用仍要各自引入一次。
- 接入后移除应用重复的字体平滑声明；应用专用的字体、字重及布局仍在应用中维护。
- 修改 common 源码后，需要发布新版 `@deepberry/common`，再升级消费仓库的依赖与锁文件。仅修改 common 工作区不会自动更新其他仓库的 `node_modules`。
