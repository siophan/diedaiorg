-- 迭代盛典官网 数据库结构
-- 站点配置（所有前台文案、区块均以 JSON 存储，可在后台编辑）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 历届盛典
CREATE TABLE IF NOT EXISTS editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  theme TEXT,
  event_date TEXT,
  venue TEXT,
  summary TEXT,
  content TEXT,
  cover TEXT,
  status TEXT DEFAULT 'finished',          -- upcoming | open | judging | finished
  registration_open INTEGER DEFAULT 0,
  submission_open INTEGER DEFAULT 0,
  submission_deadline TEXT,
  sort INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 获奖 / 入围作品
CREATE TABLE IF NOT EXISTS works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id INTEGER,
  title TEXT NOT NULL,
  en_title TEXT,
  school TEXT,
  director TEXT,
  award TEXT,
  genre TEXT,
  poster TEXT,
  synopsis TEXT,
  video_url TEXT,
  featured INTEGER DEFAULT 0,
  sort INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_works_edition ON works(edition_id);

-- 人物：发起人 / 专家评审 / 颁奖嘉宾
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'judge',           -- founder | judge | guest
  title TEXT,
  bio TEXT,
  photo TEXT,
  sort INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 合作院校 / 机构 / 媒体
CREATE TABLE IF NOT EXISTS partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_name TEXT,
  category TEXT DEFAULT 'school',          -- school | organizer | support | media | sponsor
  logo TEXT,
  url TEXT,
  sort INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 新闻动态（含公众号文章）
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  cover TEXT,
  category TEXT DEFAULT 'news',            -- news | wechat | media | notice
  source TEXT,
  source_url TEXT,
  author TEXT,
  published_at TEXT,
  featured INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',         -- published | draft
  views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_news_pub ON news(status, published_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_source ON news(source_url) WHERE source_url IS NOT NULL AND source_url <> '';

-- 图库
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  image TEXT NOT NULL,
  album TEXT DEFAULT '活动现场',
  edition_id INTEGER,
  sort INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 报名
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  edition_id INTEGER,
  name TEXT NOT NULL,
  gender TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  wechat TEXT,
  school TEXT NOT NULL,
  major TEXT,
  degree TEXT,
  grad_year TEXT,
  role TEXT,
  team_size INTEGER,
  message TEXT,
  status TEXT DEFAULT 'pending',           -- pending | approved | rejected
  admin_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 作品提交
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  edition_id INTEGER,
  title TEXT NOT NULL,
  genre TEXT,
  length_type TEXT,
  duration TEXT,
  school TEXT NOT NULL,
  major TEXT,
  grade TEXT,
  director TEXT,
  crew TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  synopsis TEXT,
  poster TEXT,
  video_url TEXT,
  netdisk_url TEXT,
  netdisk_code TEXT,
  teacher TEXT,
  status TEXT DEFAULT 'pending',           -- pending | reviewing | shortlisted | nominated | awarded | rejected
  score REAL,
  admin_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sub_edition ON submissions(edition_id, status);

-- 联系留言 / 商务合作
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, phone TEXT, email TEXT, company TEXT,
  subject TEXT, content TEXT,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 媒体库（R2）
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  filename TEXT,
  mime TEXT,
  size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 管理员
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'editor',              -- super | editor
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
