-- ============================================================
-- 塔罗牌抽牌应用 —— D1 数据库建表 SQL（SQLite 语法）
-- 执行方式：wrangler d1 execute tarot-db --remote --file=./schema.sql
-- ============================================================

-- ---------- 用户表 ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,   -- 用户自增主键
  username      TEXT    NOT NULL UNIQUE,             -- 用户名（唯一，注册时校验不可重复）
  password_hash TEXT    NOT NULL,                    -- 密码的 bcrypt 哈希（绝不存明文）
  current_skin  TEXT    NOT NULL DEFAULT 'classic',  -- 当前选中的皮肤 id（关联 skins.id）
  ai_enabled    INTEGER NOT NULL DEFAULT 0,          -- AI 解读开关：0=关（默认） 1=开
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))  -- 注册时间（UTC）
);

-- ---------- 预设皮肤表 ----------
-- 皮肤图片放在仓库静态目录 /skins/<id>/<cardId>.jpg（图片资源由站长自行上传），
-- 本表只存皮肤的基础元信息，不存图片本体。
CREATE TABLE IF NOT EXISTS skins (
  id          TEXT    PRIMARY KEY,                   -- 皮肤唯一 id（对应静态目录 /skins/<id>/）
  name        TEXT    NOT NULL,                      -- 皮肤名称（前端展示）
  preview_url TEXT    NOT NULL,                      -- 预览图地址，如 /skins/classic/preview.jpg
  sort_order  INTEGER NOT NULL DEFAULT 0             -- 排序权重（小的排前面）
);

-- ---------- 抽牌记录表 ----------
CREATE TABLE IF NOT EXISTS draws (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,     -- 记录自增主键
  user_id     INTEGER NOT NULL,                      -- 关联 users.id（谁抽的）
  draw_date   TEXT    NOT NULL,                      -- 东八区自然日 YYYY-MM-DD（每日限抽依据，后端计算）
  spread_id   TEXT    NOT NULL,                      -- 牌阵 id：daily/triangle/choice/celtic/relationship/free
  spread_name TEXT    NOT NULL,                      -- 牌阵名称（历史展示用）
  skin_id     TEXT    NOT NULL,                      -- 抽牌时使用的皮肤 id
  question    TEXT    NOT NULL DEFAULT '',           -- 用户占卜问题（可为空）
  cards       TEXT    NOT NULL,                      -- 抽到的牌，JSON 数组：[{id,nameZh,reversed}, ...]
  ai_text     TEXT,                                  -- AI 解读文本（未开启 AI 或调用失败时为 NULL）
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),  -- 记录时间（UTC）
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- 索引 ----------
-- 查某用户历史：按时间倒序
CREATE INDEX IF NOT EXISTS idx_draws_user ON draws(user_id, id DESC);

-- 【关键】部分唯一索引：仅对「每日指引」牌阵做「每用户每天一条」的硬约束。
-- 作用：防止并发/重复提交绕过每日限抽（即使应用层先查后插，也能在数据库层兜底拦截）。
-- 注意 WHERE 限定 spread_id='daily'，因此其他牌阵不受影响，可多次抽。
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_limit
  ON draws(user_id, draw_date)
  WHERE spread_id = 'daily';

-- ---------- 种子数据：至少一个默认皮肤 ----------
-- 后续新增皮肤：把图片放到 /skins/<新id>/ 目录，再 INSERT 一行即可。
INSERT INTO skins (id, name, preview_url, sort_order) VALUES
  ('classic', '经典塔罗', '/skins/classic/preview.jpg', 1);
