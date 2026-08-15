const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取所有宇宙
router.get('/', (req, res) => {
  try {
    const universes = db.prepare(`
      SELECT u.*, COUNT(DISTINCT c.id) as character_count
      FROM universes u
      LEFT JOIN characters c ON c.universe_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json({ universes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建宇宙（需要登录）
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, description, rules } = req.body;

    if (!name) {
      return res.status(400).json({ error: '宇宙名称不能为空' });
    }

    const result = db.prepare(
      'INSERT INTO universes (name, description, rules, creator_id) VALUES (?, ?, ?, ?)'
    ).run(name, description || '', JSON.stringify(rules || {}), req.user.id);

    const universe = db.prepare('SELECT * FROM universes WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ universe });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取宇宙详情
router.get('/:id', (req, res) => {
  try {
    const universe = db.prepare(`
      SELECT u.*, COUNT(DISTINCT c.id) as character_count
      FROM universes u
      LEFT JOIN characters c ON c.universe_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(req.params.id);

    if (!universe) {
      return res.status(404).json({ error: '宇宙不存在' });
    }

    res.json({ universe });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新宇宙（需要登录，且是创建者）
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const universe = db.prepare('SELECT * FROM universes WHERE id = ?').get(req.params.id);

    if (!universe) {
      return res.status(404).json({ error: '宇宙不存在' });
    }

    if (universe.creator_id !== req.user.id) {
      return res.status(403).json({ error: '无权修改此宇宙' });
    }

    const { name, description, rules } = req.body;

    db.prepare(`
      UPDATE universes
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          rules = COALESCE(?, rules),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, rules ? JSON.stringify(rules) : null, req.params.id);

    const updated = db.prepare('SELECT * FROM universes WHERE id = ?').get(req.params.id);

    res.json({ universe: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除宇宙（需要登录，且是创建者）
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const universe = db.prepare('SELECT * FROM universes WHERE id = ?').get(req.params.id);

    if (!universe) {
      return res.status(404).json({ error: '宇宙不存在' });
    }

    if (universe.creator_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此宇宙' });
    }

    db.prepare('DELETE FROM universes WHERE id = ?').run(req.params.id);

    res.json({ message: '宇宙已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
