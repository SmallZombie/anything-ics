# anything-ics
[English](README.md) | [简体中文](README.zh-CN.md)

<div align="center">
    <img src="./assets/header.png" />
    <p style="color: gray;">这盛世如你所愿.jpg</p>
</div>

本项目由其他小仓库合并而来，未来也将支持生成更多的 ics 文件，欢迎按照项目现有结构扩充自己的内容。\
产物将由 Actions 定期更新。\
什么是 [ICS](https://en.wikipedia.org/wiki/ICalendar)？\
也提供 json 版的数据，只需将订阅地址的 `.ics` 换成 `.json` 即可，定义见 `src` 内对应模块的 `type/ReleaseJsonType.ts`。

## 目前支持
- 原神生日 (gi-birthday)
- 原神活动 (gi-event)
- 崩坏星穹铁道活动 (sr-event)
- 绝区零生日 (zzz-birthday)
- 绝区零活动 (zzz-event)
- 明日方舟生日 (ark-birthday)
- 明日方舟活动 (ark-event)
- 蔚蓝档案生日 (ba-birthday)
- 蔚蓝档案日服活动 (ba-event-jp)
- 蔚蓝档案国际服活动 (ba-event-gl)
- 蔚蓝档案国服活动 (ba-event-cn)

<br/>

如果你想要的内容不在支持列表里，你可以：
- 提一个 Issues 来告诉我
- 提交一个 PR (请先查阅下方的 "提交PR的大致步骤")

## 如何使用
1. 首先需要确定你的订阅地址，在上方目前支持中选择要订阅的内容并复制后面括号里的名字。
2. 将名字拼接到 `https://avgt.ink/ics/<name>.ics` 中，拼接好后就像这样：`https://avgt.ink/ics/gi-birthday.ics`。
3. 根据不同的软件填入不同的位置，详见 [本仓库Wiki](https://github.com/SmallZombie/anything-ics/wiki)。

⚠️ 如果你的网络环境无法访问 `github.io` 那么请使用 `proxy.avgt.ink`，完整链接像这样：`https://proxy.avgt.ink/ics/gi-birthday.ics`。\
⚠️ 如果链接无法使用，请使用 issues 提醒我。

## 提交 PR 的大致步骤
1. Fork 本仓库
2. 为你的模块起一个名字，并为其在 `src` 下建立一个目录
3. 参考已存在的模块编写你的数据获取和更新逻辑
    - 对于文件的保存路径，请使用 `BaseUtil.PathHelper`
    - 检查 `BaseUtil` 里的所有类和方法，或参考其他模块的写法
4. 在 `deno.json` 中为其添加任务，任务名需要与模块名相同
5. 测试你的任务
6. 在 `.github/workflows/daily-update.yml` 中为其编写自动化任务
7. 创建 Pull request
