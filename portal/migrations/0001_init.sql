-- PriceMart trade portal, phase one schema.

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('seller', 'buyer')),
  name TEXT NOT NULL,
  name_norm TEXT NOT NULL,
  vat_number TEXT,
  vat_norm TEXT,
  country TEXT,
  website TEXT,
  business_type TEXT,
  email_domain TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'info_requested', 'approved', 'rejected')),
  source TEXT NOT NULL DEFAULT 'register' CHECK (source IN ('register', 'invite')),
  admin_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX idx_companies_status ON companies (status, created_at);
CREATE INDEX idx_companies_vat ON companies (vat_norm);
CREATE INDEX idx_companies_domain ON companies (email_domain);
CREATE INDEX idx_companies_name ON companies (name_norm);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies (id),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  job_title TEXT,
  phone TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE INDEX idx_users_company ON users (company_id);

-- One row per thing a company sends us: stock (sellers) or a want (buyers).
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies (id),
  user_id TEXT REFERENCES users (id),
  kind TEXT NOT NULL CHECK (kind IN ('stock', 'want')),
  mode TEXT NOT NULL CHECK (mode IN ('describe', 'upload', 'details')),
  body TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'offer_sent', 'done', 'closed')),
  admin_summary TEXT,
  admin_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_submissions_company ON submissions (company_id, created_at);
CREATE INDEX idx_submissions_status ON submissions (status, created_at);

CREATE TABLE lots (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions (id),
  position INTEGER NOT NULL,
  product TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit TEXT,
  best_before TEXT,
  brand TEXT,
  ean TEXT,
  category TEXT,
  stock_country TEXT,
  packaging_languages TEXT,
  storage TEXT,
  asking_price TEXT,
  notes TEXT
);
CREATE INDEX idx_lots_submission ON lots (submission_id, position);

CREATE TABLE files (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions (id),
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_files_submission ON files (submission_id);

-- One-time sign-in links. Only the SHA-256 of the token is stored.
CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_login_tokens_email ON login_tokens (email, created_at);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  submission_id TEXT,
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_company ON events (company_id, created_at);
CREATE INDEX idx_events_submission ON events (submission_id, created_at);

-- Every email the portal tries to send. body_text is only kept in DEV_MODE.
CREATE TABLE email_log (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  body_text TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_email_log_to ON email_log (to_email, created_at);

CREATE TABLE rate_events (
  key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_rate_events ON rate_events (key, created_at);
