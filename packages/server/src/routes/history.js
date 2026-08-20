const express = require('express');
const db = require('../db');

const router = express.Router();

// 获取变更历史列表
router.get('/', (req, res) => {
  try {
    const { entity_type, entity_id, trigger_type } = req.query;

    let sql = `
      SELECT h.*,
        u.username as user_name
      FROM history h
      LEFT JOIN users u ON u.id = h.user_id
      WHERE 1=1
    `;
    const params = [];

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

    sql += ' ORDER BY h.created_at DESC';

    const history = db.prepare(sql).all(...params);

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
