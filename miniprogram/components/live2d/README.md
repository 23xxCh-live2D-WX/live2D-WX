# Live2D 技术探针

`<live2d-avatar state="idle|listening|speaking|thinking" size="320" />` 默认显示原创 CSS 动态角色。显式设置 `model="components/live2d/local_model/model3.json"`、并暂存模型后，组件尝试用 Cubism Core + 原生 WebGL 渲染；失败时自动回到 CSS 角色。`model` 当前只接受**小程序代码包内路径**。当前不是已验证可发布的 Live2D 实现。

本机技术样例：`python prepare_local_model.py`（依赖 Pillow，当前机器已安装 12.2）从 `E:\software\airi\q652` 读取“甜兔”，生成 `local_model/`。脚本将 8192px 贴图缩至 2048px，并将 `.moc3` 暂存为 Base64 JSON，因为模拟器的文件管理器读取包内 `.moc3` 返回 `permission denied`。`local_model/` 已从交付目录删除；执行脚本会重新生成它。**它会被微信开发者工具打包，`.gitignore` 不会排除代码包文件。测试结束后必须删除。**

当前证据：Node 中官方 Core 5.1.0 成功解析原始甜兔模型（219 个网格、2 张贴图、23 个遮罩）；微信开发者工具 touristappid 模拟器可读取暂存的 `model3.json`，原始 `.moc3` 读取失败。Base64 适配后的 WebGL 像素结果、iOS/Android 真机表现均未确认。暂存模型约 8.3 MB，超过小程序单个主包/分包常见 2 MB 限制；发布版需要完成 HTTPS 合法域名下载适配并核查模型使用授权。

`core.min.js` 来自 [Live2D 官方 Web Core](https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js)，文件头标明 `Redistributable Code`，在文件末尾只加了 CommonJS 导出。Core 受 [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) 约束；[官方平台列表](https://docs.live2d.com/en/cubism-sdk-manual/platform/)没有将微信原生小程序列为受支持环境。公开发布前还须按 [SDK Release License](https://www.live2d.com/en/sdk/license/) 判断 AI 角色应用的许可类型。
