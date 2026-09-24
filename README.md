# 开口练面试：微信小程序原型

当前源码已实现：选岗位 → 3 道题各答主问和追问 → 查看本机保存的回答与固定复盘提示。每轮可以本地录音 60 秒并回听，然后手动填写回答要点；录音不上传、不保存到报告。动态组件默认显示原创状态动画；另有 `.moc3` WebGL 技术探针，**尚无开发者工具画面或真机证据证明 Live2D 渲染成功**。当前不能验证自动语音追问和反馈效果。

## 本地打开

使用微信开发者工具导入本目录 `E:\AI WORK\微信小程序比赛`。项目暂用 `touristappid`，可先检查模拟器界面；真机预览及云开发需要本项目的真实 AppID。

命令行检查：

```powershell
node scripts/check.js
& 'E:\software\微信小程序\微信web开发者工具\cli.bat' open --project 'E:\AI WORK\微信小程序比赛' --lang zh
```

## 接入云端后

在 `project.config.json` 填入本项目 AppID，在 `miniprogram/config.js` 填入云开发环境 ID，并核对模型名称和当前权限。首页需勾选同意发送回答，才会调用云端生成追问与复盘。云端失败时会显示固定内容，不能标为 AI 评分。

## 验证边界

- `node scripts/check.js` 用模拟微信 API 检查 6 轮问答、报告保存与录音状态流，不能替代开发者工具编译或真机测试。
- 微信开发者工具 CLI 已能打开本项目；`preview` 进入上传阶段后返回“需要重新登录”。自动化接口只读到首页路由，元素查询超时，页面交互和真机效果未验收。
- 第三方模型文件**没有留在交付包内**。[Live2D 技术探针说明](miniprogram/components/live2d/README.md)记录了本地重建方式；暂存样例约 8.3 MB，超过[单包 2 MB 限制](https://cloud.tencent.com/document/product/1301/93145)。发布版须换更小的自有模型或经合规 HTTPS 资源加载，并确认资产使用权。
- 本地录音也需麦克风授权；用真实 AppID 上线前须在小程序后台配置并核对隐私保护指引。
- 微信端竞品实测、目标用户访谈与静态 / Live2D 对照尚未执行。执行表见 [fieldwork.md](research/fieldwork.md)。
- 发布前仍需确认模型使用权、AppID、服务类目、所需 AI 材料、iOS / Android 真机表现及大赛提交材料。
