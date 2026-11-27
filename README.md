# 塔罗牌抽牌 · 单页应用（Cloudflare Pages + D1）

原生 HTML + CSS + JavaScript 前端，零框架、无打包；后端用
**Cloudflare Pages Functions + D1（SQLite）**，账号、历史、皮肤、每日限抽、
AI 解读全部走 Cloudflare 免费生态。前端不接触任何密钥。

## 目录结构

```
tarot-app/
├── index.html                页面骨架与弹窗结构
├── css/style.css             全部样式（深色神秘风、3D 翻牌、响应式）
├── js/
│   ├── data/
│   │   ├── cards.js          78 张牌义数据（唯一数据源）
│   │   └── spreads.js        6 种牌阵配置
│   ├── core/
│   │   ├── storage.js        本地图片缓存封装（IndexedDB → localStorage → 内存）
│   │   ├── api.js            请求封装（自动带 JWT、统一 401 处理）
│   │   ├── auth.js           登录态管理（token / user / 皮肤 / AI 开关）
│   │   ├── skins.js          预设皮肤（来自后端 /api/skins）
│   │   └── tarot.js          洗牌 / 抽牌 / 解读拼装逻辑
│   ├── ui/
│   │   ├── render.js         牌阵渲染与翻牌交互（含登录校验、每日限抽、保存记录）
│   │   ├── modal.js          弹窗（牌义详情 / 皮肤切换 / 设置）
│   │   ├── toast.js          轻量提示
│   │   ├── auth-modal.js     登录 / 注册弹窗
│   │   ├── history.js        抽牌历史页
│   │   └── main.js           入口：初始化、Tab、顶部操作绑定
├── functions/
│   ├── _shared/              后端共享模块（jwt / response / auth / time / ai）
│   └── api/                  接口（auth、me、skins、history、draw）
├── schema.sql                D1 建表 SQL（含每日限抽唯一索引与种子皮肤）
├── wrangler.toml             wrangler 配置（含 D1 绑定）
├── package.json              bcryptjs + wrangler
└── .dev.vars.example         本地环境变量模板（复制为 .dev.vars）
```

## 一、环境变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | ✅ | 签发/校验登录 token 的密钥（越长越随机越好） |
| `AI_API_URL` | ⭕ | 大模型 OpenAI 兼容接口地址，默认 `https://api.deepseek.com/v1/chat/completions` |
| `AI_MODEL` | ⭕ | 模型名，默认 `deepseek-chat` |
| `AI_API_KEY` | ⭕ | 大模型 API Key（不填则 AI 解读不可用，自动走兜底文案） |

- **本地开发**：复制 `.dev.vars.example` 为 `.dev.vars` 并填值（该文件已 gitignore）。
- **生产环境**：在 Cloudflare 控制台 **Pages 项目 → Settings → Environment variables**
  添加（或对密钥用 `wrangler pages secret put <名称>` 命令行注入）。
- 密钥**只存在服务端**，前端 JS 里不出现任何 Key。

## 二、本地调试

```bash
npm install

# 1. 创建 D1 数据库（拿到 database_id 后填进 wrangler.toml 的 REPLACE_WITH_YOUR_D1_DATABASE_ID）
npx wrangler d1 create tarot-db

# 2. 把建表 SQL 应用到「本地」D1
npx wrangler d1 execute tarot-db --local --file=./schema.sql

# 3. 起本地服务（同时跑前端 + Functions + 本地 D1）
npm run dev            # 等价 npx wrangler pages dev .
```

打开终端提示的 `http://localhost:8788` 即可。`.dev.vars` 会自动注入为环境变量。

## 三、部署上线

```bash
# 1. 建表 SQL 应用到「远程」D1（database_id 已填好）
npx wrangler d1 execute tarot-db --remote --file=./schema.sql

# 2. 部署到 Cloudflare Pages（wrangler.toml 里的 D1 绑定会一并生效）
npm run deploy         # 等价 npx wrangler pages deploy .
```

部署完成后，把环境变量（`JWT_SECRET`、`AI_*`）加到 Pages 项目设置里即可。
若部署后 D1 绑定未自动生效，可在 **Pages 项目 → Settings → Functions →
D1 database bindings** 手动添加：变量名 `DB`、选择 `tarot-db`。

> 部署到 Pages 后所有接口与前端同源，前端用相对路径 `/api/...` 请求，无跨域问题。

## 四、功能一览

- **账号**：注册（用户名唯一 + bcrypt 密码哈希）、登录（JWT，7 天过期）、退出；未登录时抽牌按钮半透明、点击引导登录。
- **6 种玩法**：单张牌（每日指引）/ 圣三角 / 二选一 / 凯尔特十字 / 关系牌阵 / 自由抽牌（1~10 张）。
- **每日限抽**：仅「每日指引」牌阵，同一账号每天（东八区）只可抽一次，由**后端**校验，杜绝改本地时间绕过。
- **抽牌历史**：每次抽牌自动存 D1，顶部「历史」可回看牌面与 AI 解读。
- **预设皮肤**：皮肤图片放静态目录 `/skins/<skinId>/<cardId>.jpg`，DB 只存元数据；顶部「套系」切换。
- **AI 解读**：设置里手动开启后，抽牌会调用大模型生成解读并存入记录；失败/超时自动兜底，不卡页面。
- **逐张翻牌 / 逆位 / 牌义详情 / 整体解读**：逻辑不变。

## 五、新增一个皮肤（预设）

1. 把一整套牌面图片放到静态目录，命名约定 `/skins/<skinId>/<cardId>.jpg`
   （例如 `skins/moon/major-00.jpg`、`skins/moon/cups-01.jpg`），另加一张 `skins/moon/preview.jpg` 作预览图。
2. 在 `schema.sql` 的 `skins` 表里 `INSERT` 一条：
   ```sql
   INSERT INTO skins (id, name, preview_url, sort_order)
   VALUES ('moon', '月夜塔罗', '/skins/moon/preview.jpg', 2);
   ```
3. 重新执行 `--remote --file=./schema.sql`（INSERT 重复会报错，可改为单条 `INSERT OR IGNORE`）。
4. 刷新页面，「套系」弹窗即出现新皮肤。缺某张图时前端自动显示占位牌面，不会报错。

## 六、新增一个牌阵

在 `js/data/spreads.js` 的 `SPREADS` 数组加一个对象即可，视图自动渲染：

```js
{
  id: 'my-spread',              // 唯一 ID
  name: '自定义牌阵',            // Tab 显示名称
  subtitle: '说明文字',
  count: 4,                     // 抽牌张数（自由抽牌用 null）
  layout: 'line',               // 'line' 横排 | 'choice' 左右对比 | 'cross' 凯尔特十字
  free: false,                  // 是否自由抽牌
  reversed: true,               // 是否允许逆位
  question: true,               // 是否显示问题输入框
  positions: [                  // 位置含义（数量须与 count 一致）
    { id: 'p0', label: '位置一', meaning: '含义说明' }
    // ...
  ]
}
```

## 七、重点测试用例

| 用例 | 步骤 | 预期 |
| --- | --- | --- |
| 重复注册 | 用同一用户名注册两次 | 第二次返回「该用户名已被注册」 |
| 登录鉴权 | 退出后抽牌 | 抽牌按钮半透明，点击弹出登录框 |
| 每日限抽 | 抽「每日指引」后再次进入并抽牌 | 第二次被拦截，提示「今日已抽取过…请明天再来」，不产生新记录 |
| 每日限抽-跨时区 | 服务器按东八区（UTC+8）计日 | 判定与用户本地时区无关 |
| token 过期 | 手动清掉 localStorage 的 `tarot_token` 后请求任意接口 | 自动登出并跳回登录弹窗 |
| 皮肤切换 | 登录后切换皮肤再刷新 | 皮肤保持；未登录则回落到默认皮肤 |
| AI 解读 | 设置里开启 AI 后抽牌 | 结果末尾出现「✦ AI 解读」；Key 缺失时显示兜底文案 |

## 八、安全说明

- 密码用 `bcryptjs` 加盐哈希存储，绝不存明文。
- 鉴权用 HS256 JWT（密钥在环境变量），过期时间 7 天。
- 每日限抽依赖 `draws` 表的**部分唯一索引**（`spread_id='daily'`），并发下也不会重复入库。
- 所有数据库写入均用参数化 SQL，无 SQL 注入风险。
