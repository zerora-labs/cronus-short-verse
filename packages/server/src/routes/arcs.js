const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取宇宙下的所有故事弧
router.get('/universe/:universeId', (req, res) => {
  try {
    const arcs = db.prepare(`
      SELECT a.*,
        (SELECT COUNT(*) FROM episodes WHERE arc_id = a.id) as episode_count
      FROM arcs a
      WHERE a.universe_id = ?
      ORDER BY a.season_number, a.created_at
    `).all(req.params.universeId);

    res.json({ arcs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建故事弧（需要登录）
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, description, universe_id, season_number } = req.body;

    if (!name || !universe_id) {
      return res.status(400).json({ error: '名称和宇宙ID不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO arcs (name, description, universe_id, season_number)
      VALUES (?, ?, ?, ?)
    `).run(name, description || '', universe_id, season_number || 1);

    const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ arc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取故事弧详情
router.get('/:id', (req, res) => {
  try {
    const arc = db.prepare(`
      SELECT a.*, u.name as universe_name
      FROM arcs a
      LEFT JOIN universes u ON u.id = a.universe_id
      WHERE a.id = ?
    `).get(req.params.id);

    if (!arc) {
      return res.status(404).json({ error: '故事弧不存在' });
    }

    // 获取该弧下的剧集，按顺序排列
    const episodes = db.prepare(`
      SELECT * FROM episodes
      WHERE arc_id = ?
      ORDER BY sequence_number
    `).all(req.params.id);

    res.json({ arc, episodes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新故事弧（需要登录，且是创建者）
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(req.params.id);

    if (!arc) {
      return res.status(404).json({ error: '故事弧不存在' });
    }

    const { name, description, season_number } = req.body;

    db.prepare(`
      UPDATE arcs
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          season_number = COALESCE(?, season_number),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, season_number, req.params.id);

    const updated = db.prepare('SELECT * FROM arcs WHERE id = ?').get(req.params.id);

    res.json({ arc: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除故事弧（需要登录，且是创建者）
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(req.params.id);

    if (!arc) {
      return res.status(404).json({ error: '故事弧不存在' });
    }

    db.prepare('DELETE FROM arcs WHERE id = ?').run(req.params.id);

    res.json({ message: '故事弧已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 向故事弧添加剧集（需要登录）
router.post('/:id/episodes', authMiddleware, (req, res) => {
  try {
    const arc = db.prepare('SELECT * FROM arcs WHERE id = ?').get(req.params.id);

    if (!arc) {
      return res.status(404).json({ error: '故事弧不存在' });
    }

    const { title, description, sequence_number, duration_seconds } = req.body;

    if (!title || sequence_number === undefined) {
      return res.status(400).json({ error: '标题和序列号不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO episodes (title, description, sequence_number, arc_id, duration_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, description || '', sequence_number, req.params.id, duration_seconds || 120);

    const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ episode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取故事弧下的所有剧集
router.get('/:id/episodes', (req, res) => {
  try {
    const episodes = db.prepare(`
      SELECT * FROM episodes
      WHERE arc_id = ?
      ORDER BY sequence_number
    `).all(req.params.id);

    res.json({ episodes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
