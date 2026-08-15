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

// ========== Fork 宇宙（复制宇宙） ==========
router.post('/:id/fork', authMiddleware, (req, res) => {
  try {
    const source = db.prepare('SELECT * FROM universes WHERE id = ?').get(req.params.id);
    if (!source) {
      return res.status(404).json({ error: '源宇宙不存在' });
    }

    const { name } = req.body;
    const forkName = name || `${source.name}（分支）`;

    // 创建新宇宙
    const result = db.prepare(
      'INSERT INTO universes (name, description, rules, creator_id) VALUES (?, ?, ?, ?)'
    ).run(forkName, source.description, source.rules, req.user.id);
    const newUniverseId = result.lastInsertRowid;

    // 复制所有角色
    const characters = db.prepare('SELECT * FROM characters WHERE universe_id = ?').all(req.params.id);
    const oldToNew = {};

    for (const char of characters) {
      const charResult = db.prepare(`
        INSERT INTO characters (name, description, celestial_type, universe_id, creator_id, mass, traits, goals, backstory)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(char.name, char.description, char.celestial_type, newUniverseId, req.user.id, char.mass, char.traits, char.goals, char.backstory);
      oldToNew[char.id] = charResult.lastInsertRowid;
    }

    // 复制所有关系
    const relationships = db.prepare('SELECT * FROM relationships WHERE character_a_id IN (SELECT id FROM characters WHERE universe_id = ?)').all(req.params.id);
    for (const rel of relationships) {
      const newA = oldToNew[rel.character_a_id];
      const newB = oldToNew[rel.character_b_id];
      if (newA && newB) {
        db.prepare(`
          INSERT INTO relationships (character_a_id, character_b_id, type, strength, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(newA, newB, rel.type, rel.strength, rel.description);
      }
    }

    const newUniverse = db.prepare('SELECT * FROM universes WHERE id = ?').get(newUniverseId);

    res.status(201).json({
      message: '宇宙已复制',
      universe: newUniverse,
      stats: {
        characters_copied: characters.length,
        relationships_copied: relationships.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 导出编年史 ==========
router.get('/:id/export', (req, res) => {
  try {
    const universe = db.prepare('SELECT * FROM universes WHERE id = ?').get(req.params.id);
    if (!universe) {
      return res.status(404).json({ error: '宇宙不存在' });
    }

    const characters = db.prepare(`
      SELECT * FROM characters WHERE universe_id = ? ORDER BY mass DESC
    `).all(req.params.id);

    const relationships = db.prepare(`
      SELECT r.*, c1.name as char_a_name, c1.celestial_type as char_a_type,
             c2.name as char_b_name, c2.celestial_type as char_b_type
      FROM relationships r
      JOIN characters c1 ON c1.id = r.character_a_id
      JOIN characters c2 ON c2.id = r.character_b_id
      WHERE c1.universe_id = ? OR c2.universe_id = ?
    `).all(req.params.id, req.params.id);

    // 生成 Markdown 编年史
    const typeEmoji = { star: '⭐', planet: '🪐', comet: '☄️', meteor: '🌠', black_hole: '🕳️' };
    const typeLabel = { star: '恒星', planet: '行星', comet: '彗星', meteor: '流星', black_hole: '黑洞' };
    const relTypeLabel = { attraction: '吸引', repulsion: '排斥', orbit: '轨道', collision: '碰撞' };

    let md = `# ${universe.name} 编年史\n\n`;
    md += `> ${universe.description || ''}\n\n`;
    md += `---\n\n`;
    md += `## 角色表（${characters.length} 人）\n\n`;

    for (const c of characters) {
      const emoji = typeEmoji[c.celestial_type] || '';
      const label = typeLabel[c.celestial_type] || c.celestial_type;
      md += `### ${emoji} ${c.name} — ${label}（质量 ${c.mass}）\n\n`;
      if (c.description) md += `${c.description}\n\n`;
      if (c.backstory) md += `**背景**：${c.backstory}\n\n`;
    }

    md += `---\n\n`;
    md += `## 关系网络（${relationships.length} 条）\n\n`;
    md += `| 角色 A | 关系 | 角色 B | 强度 | 描述 |\n`;
    md += `|--------|------|--------|------|------|\n`;

    for (const r of relationships) {
      const emojiA = typeEmoji[r.char_a_type] || '';
      const emojiB = typeEmoji[r.char_b_type] || '';
      md += `| ${emojiA} ${r.char_a_name} | ${relTypeLabel[r.type] || r.type} | ${emojiB} ${r.char_b_name} | ${r.strength} | ${r.description || ''} |\n`;
    }

    md += `\n---\n\n`;
    md += `## 天体类型说明\n\n`;
    md += `| 类型 | 角色数 | 说明 |\n`;
    md += `|------|--------|------|\n`;

    const grouped = {};
    for (const c of characters) {
      grouped[c.celestial_type] = (grouped[c.celestial_type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(grouped)) {
      md += `| ${typeEmoji[type]} ${typeLabel[type]} | ${count} | ${type === 'star' ? '核心主角' : type === 'planet' ? '常驻配角' : type === 'comet' ? '客串角色' : type === 'meteor' ? '一次性事件' : '高风险点'} |\n`;
    }

    md += `\n---\n\n`;
    md += `*导出时间：${new Date().toLocaleString('zh-CN')}*\n`;
    md += `*由 CronusShortVerse 生成*\n`;

    res.json({
      universe: universe.name,
      format: 'markdown',
      content: md,
      stats: {
        characters: characters.length,
        relationships: relationships.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
