const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'cronus.db');

// 确保 data 目录存在
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// 开启 WAL 模式，提升并发性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库表
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    reputation_score INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 宇宙/世界观表
  CREATE TABLE IF NOT EXISTS universes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    rules TEXT,  -- JSON 格式的规则
    creator_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  -- 角色表
  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    celestial_type TEXT NOT NULL CHECK(celestial_type IN ('star', 'planet', 'comet', 'meteor', 'black_hole')),
    universe_id INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    mass INTEGER DEFAULT 1,  -- 叙事重要性
    traits TEXT,  -- JSON
    goals TEXT,  -- JSON
    backstory TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  -- 关系表
  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_a_id INTEGER NOT NULL,
    character_b_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('attraction', 'repulsion', 'orbit', 'collision')),
    strength INTEGER DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_a_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (character_b_id) REFERENCES characters(id) ON DELETE CASCADE
  );

  -- 故事弧表
  CREATE TABLE IF NOT EXISTS arcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    universe_id INTEGER NOT NULL,
    season_number INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
  );

  -- 剧集表
  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    sequence_number INTEGER NOT NULL,
    arc_id INTEGER NOT NULL,
    duration_seconds INTEGER DEFAULT 120,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (arc_id) REFERENCES arcs(id) ON DELETE CASCADE
  );

  -- 提案表
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    proposer_id INTEGER NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('character', 'universe', 'relationship')),
    target_id INTEGER NOT NULL,
    proposed_changes TEXT,  -- JSON
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    voting_end_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposer_id) REFERENCES users(id)
  );

  -- 投票表
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    voter_id INTEGER NOT NULL,
    vote TEXT NOT NULL CHECK(vote IN ('approve', 'reject')),
    weight INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_id) REFERENCES users(id)
  );
`);

module.exports = db;
