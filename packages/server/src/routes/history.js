const express = require('express');
const db = require('../db');

const router = express.Router();

// 获取变更历史列表
router.get('/', (req, res) => {
  try {
    const { entity_type, entity_id, trigger_type, universe_id } = req.query;

    let sql, params;

    if (universe_id) {
      // 按宇宙筛选：通过 entity 关联到 universe
      sql = `
        SELECT h.*, u.username as user_name
        FROM history h
        LEFT JOIN users u ON u.id = h.user_id
        WHERE (
          (h.entity_type = 'character' AND h.entity_id IN (SELECT id FROM characters WHERE universe_id = ?))
          OR (h.entity_type = 'universe' AND h.entity_id = ?)
          OR (h.entity_type = 'relationship' AND h.entity_id IN (
            SELECT r.id FROM relationships r
            JOIN characters c ON c.id = r.character_a_id
            WHERE c.universe_id = ?
          ))
          OR (h.entity_type = 'proposal' AND h.entity_id IN (SELECT id FROM proposals WHERE universe_id = ?))
          OR (h.entity_type = 'arc' AND h.entity_id IN (SELECT id FROM arcs WHERE universe_id = ?))
          OR (h.entity_type = 'event' AND h.entity_id IN (SELECT id FROM events WHERE universe_id = ?))
        )
      `;
      params = [universe_id, universe_id, universe_id, universe_id, universe_id, universe_id];
    } else {
      sql = `
        SELECT h.*, u.username as user_name
        FROM history h
        LEFT JOIN users u ON u.id = h.user_id
        WHERE 1=1
      `;
      params = [];
    }

    if (entity_type) {
      sql += ' AND h.entity_type = ?';
      params.push(entity_type);
    }

    if (entity_id) {
      sql += ' AND h.entity_id = ?';
      params.push(entity_id);
    }

    if (trigger_type) {
      sql += ' AND h.trigger_type = ?';
      params.push(trigger_type);
    }

    sql += ' ORDER BY h.created_at DESC LIMIT 50';

    const history = db.prepare(sql).all(...params);

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
