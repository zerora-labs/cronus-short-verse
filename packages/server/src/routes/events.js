const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取宇宙下的所有事件
router.get('/universe/:universeId', (req, res) => {
  try {
    const { event_type } = req.query;

    let sql = `
      SELECT e.*,
        GROUP_CONCAT(c.name) as character_names
      FROM events e
      LEFT JOIN event_characters ec ON ec.event_id = e.id
      LEFT JOIN characters c ON c.id = ec.character_id
      WHERE e.universe_id = ?
    `;
    const params = [req.params.universeId];

    if (event_type && ['signal', 'noise'].includes(event_type)) {
      sql += ' AND e.event_type = ?';
      params.push(event_type);
    }

    sql += ' GROUP BY e.id ORDER BY e.created_at DESC';

    const events = db.prepare(sql).all(...params);

    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建事件（需要登录）
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, description, event_type, episode_id, universe_id, character_ids } = req.body;

    if (!name || !universe_id) {
      return res.status(400).json({ error: '名称和宇宙ID不能为空' });
    }

    const validEventTypes = ['signal', 'noise'];
    if (event_type && !validEventTypes.includes(event_type)) {
      return res.status(400).json({ error: '无效的事件类型' });
    }

    const result = db.prepare(`
      INSERT INTO events (name, description, event_type, episode_id, universe_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description || '', event_type || 'signal', episode_id || null, universe_id);

    const eventId = result.lastInsertRowid;

    // 插入事件角色关联
    if (character_ids && Array.isArray(character_ids) && character_ids.length > 0) {
      const insertEC = db.prepare(`
        INSERT INTO event_characters (event_id, character_id)
        VALUES (?, ?)
      `);

      for (const characterId of character_ids) {
        insertEC.run(eventId, characterId);
      }
    }

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);

    res.status(201).json({ event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取事件详情
router.get('/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '事件不存在' });
    }

    // 获取事件关联的角色
    const characters = db.prepare(`
      SELECT c.id, c.name, c.celestial_type, ec.impact_description
      FROM event_characters ec
      JOIN characters c ON c.id = ec.character_id
      WHERE ec.event_id = ?
    `).all(req.params.id);

    res.json({ event, characters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除事件（需要登录）
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '事件不存在' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);

    res.json({ message: '事件已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
