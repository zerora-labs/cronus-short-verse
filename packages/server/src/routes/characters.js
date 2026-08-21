const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取宇宙下的所有角色
router.get('/universe/:universeId', (req, res) => {
  try {
    const characters = db.prepare(`
      SELECT * FROM characters
      WHERE universe_id = ?
      ORDER BY mass DESC, created_at DESC
    `).all(req.params.universeId);

    res.json({ characters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建角色（需要登录）
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, description, celestial_type, universe_id, mass, traits, goals, backstory } = req.body;

    if (!name || !celestial_type || !universe_id) {
      return res.status(400).json({ error: '名称、天体类型和宇宙ID不能为空' });
    }

    const validTypes = ['star', 'planet', 'comet', 'meteor', 'black_hole'];
    if (!validTypes.includes(celestial_type)) {
      return res.status(400).json({ error: '无效的天体类型' });
    }

    const result = db.prepare(`
      INSERT INTO characters (name, description, celestial_type, universe_id, creator_id, mass, traits, goals, backstory)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description || '',
      celestial_type,
      universe_id,
      req.user.id,
      mass || 1,
      JSON.stringify(traits || []),
      JSON.stringify(goals || []),
      backstory || ''
    );

    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ character });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取角色详情
router.get('/:id', (req, res) => {
  try {
    const character = db.prepare(`
      SELECT c.*, u.name as universe_name
      FROM characters c
      LEFT JOIN universes u ON u.id = c.universe_id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    // 获取角色的关系
    const relationships = db.prepare(`
      SELECT r.*,
        CASE WHEN r.character_a_id = ? THEN c2.name ELSE c1.name END as other_name,
        CASE WHEN r.character_a_id = ? THEN c2.celestial_type ELSE c1.celestial_type END as other_type
      FROM relationships r
      LEFT JOIN characters c1 ON c1.id = r.character_a_id
      LEFT JOIN characters c2 ON c2.id = r.character_b_id
      WHERE r.character_a_id = ? OR r.character_b_id = ?
    `).all(req.params.id, req.params.id, req.params.id, req.params.id);

    res.json({ character, relationships });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新角色（需要登录，且是创建者）
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);

    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    if (character.creator_id !== req.user.id) {
      return res.status(403).json({ error: '无权修改此角色' });
    }

    const { name, description, celestial_type, mass, traits, goals, backstory } = req.body;

    db.prepare(`
      UPDATE characters
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          celestial_type = COALESCE(?, celestial_type),
          mass = COALESCE(?, mass),
          traits = COALESCE(?, traits),
          goals = COALESCE(?, goals),
          backstory = COALESCE(?, backstory),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      description,
      celestial_type,
      mass,
      traits ? JSON.stringify(traits) : null,
      goals ? JSON.stringify(goals) : null,
      backstory,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);

    res.json({ character: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除角色（需要登录，且是创建者）
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);

    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    if (character.creator_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此角色' });
    }

    db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);

    res.json({ message: '角色已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Galaxy Engine 数据接口 ==========

// 获取宇宙的 Galaxy 数据（节点 + 边）
router.get('/galaxy/:universeId', (req, res) => {
  try {
    // 获取所有角色作为节点，标记是否有已通过的提案
    const nodes = db.prepare(`
      SELECT c.id, c.name, c.celestial_type, c.mass, c.description,
        CASE c.celestial_type
          WHEN 'star' THEN '#fbbf24'
          WHEN 'planet' THEN '#60a5fa'
          WHEN 'comet' THEN '#a78bfa'
          WHEN 'meteor' THEN '#f87171'
          WHEN 'black_hole' THEN '#6b7280'
        END as color,
        EXISTS(
          SELECT 1 FROM proposals p
          WHERE p.target_type = 'character' AND p.target_id = c.id AND p.status = 'approved'
        ) as has_evolution
      FROM characters c
      WHERE c.universe_id = ?
    `).all(req.params.universeId);

    // 获取所有关系作为边
    const edges = db.prepare(`
      SELECT r.id, r.character_a_id as source, r.character_b_id as target,
             r.type, r.strength, r.description,
             CASE r.type
               WHEN 'attraction' THEN '#22c55e'
               WHEN 'repulsion' THEN '#ef4444'
               WHEN 'orbit' THEN '#3b82f6'
               WHEN 'collision' THEN '#f59e0b'
             END as color
      FROM relationships r
      JOIN characters c1 ON c1.id = r.character_a_id
      JOIN characters c2 ON c2.id = r.character_b_id
      WHERE c1.universe_id = ? OR c2.universe_id = ?
    `).all(req.params.universeId, req.params.universeId);

    res.json({ nodes, edges });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 关系管理 ==========

// 创建关系
router.post('/relationships', authMiddleware, (req, res) => {
  try {
    const { character_a_id, character_b_id, type, strength, description } = req.body;

    if (!character_a_id || !character_b_id || !type) {
      return res.status(400).json({ error: '角色ID和关系类型不能为空' });
    }

    const validTypes = ['attraction', 'repulsion', 'orbit', 'collision'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的关系类型' });
    }

    const result = db.prepare(`
      INSERT INTO relationships (character_a_id, character_b_id, type, strength, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(character_a_id, character_b_id, type, strength || 1, description || '');

    const relationship = db.prepare('SELECT * FROM relationships WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ relationship });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取宇宙下的关系
router.get('/relationships/:universeId', (req, res) => {
  try {
    const relationships = db.prepare(`
      SELECT r.*,
        c1.name as character_a_name, c1.celestial_type as character_a_type,
        c2.name as character_b_name, c2.celestial_type as character_b_type
      FROM relationships r
      JOIN characters c1 ON c1.id = r.character_a_id
      JOIN characters c2 ON c2.id = r.character_b_id
      WHERE c1.universe_id = ? OR c2.universe_id = ?
    `).all(req.params.universeId, req.params.universeId);

    res.json({ relationships });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// 更新关系
router.put('/relationships/:id', authMiddleware, (req, res) => {
  try {
    const relationship = db.prepare('SELECT * FROM relationships WHERE id = ?').get(req.params.id);
    if (!relationship) {
      return res.status(404).json({ error: '关系不存在' });
    }

    const { type, strength, description } = req.body;
    const validTypes = ['attraction', 'repulsion', 'orbit', 'collision'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的关系类型' });
    }

    db.prepare(`
      UPDATE relationships
      SET type = COALESCE(?, type),
          strength = COALESCE(?, strength),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(type, strength, description, req.params.id);

    const updated = db.prepare('SELECT * FROM relationships WHERE id = ?').get(req.params.id);
    res.json({ relationship: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除关系
router.delete('/relationships/:id', authMiddleware, (req, res) => {
  try {
    const relationship = db.prepare('SELECT * FROM relationships WHERE id = ?').get(req.params.id);
    if (!relationship) {
      return res.status(404).json({ error: '关系不存在' });
    }

    db.prepare('DELETE FROM relationships WHERE id = ?').run(req.params.id);
    res.json({ message: '关系已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
