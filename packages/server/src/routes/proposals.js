const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取宇宙下的所有提案
router.get('/universe/:universeId', (req, res) => {
  try {
    const proposals = db.prepare(`
      SELECT p.*,
        u.username as proposer_name,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = p.id AND vote = 'approve') as approve_count,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = p.id AND vote = 'reject') as reject_count
      FROM proposals p
      LEFT JOIN users u ON u.id = p.proposer_id
      WHERE p.universe_id = ?
      ORDER BY p.created_at DESC
    `).all(req.params.universeId);

    res.json({ proposals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建提案（需要登录）
router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, description, universe_id, target_type, target_id, proposed_changes, voting_end_at } = req.body;

    if (!title || !target_type || !target_id || !universe_id) {
      return res.status(400).json({ error: '标题、目标类型、目标ID和宇宙ID不能为空' });
    }

    const validTargetTypes = ['character', 'universe', 'relationship'];
    if (!validTargetTypes.includes(target_type)) {
      return res.status(400).json({ error: '无效的目标类型' });
    }

    const result = db.prepare(`
      INSERT INTO proposals (title, description, proposer_id, universe_id, target_type, target_id, proposed_changes, status, voting_end_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      title,
      description || '',
      req.user.id,
      universe_id,
      target_type,
      target_id,
      JSON.stringify(proposed_changes || {}),
      voting_end_at || null
    );

    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ proposal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 投票（需要登录）
router.post('/:id/vote', authMiddleware, (req, res) => {
  try {
    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);

    if (!proposal) {
      return res.status(404).json({ error: '提案不存在' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: '该提案已结束投票' });
    }

    const { vote } = req.body;

    if (!vote || !['approve', 'reject'].includes(vote)) {
      return res.status(400).json({ error: '投票选项无效，必须是 approve 或 reject' });
    }

    // 检查是否已经投过票
    const existingVote = db.prepare(
      'SELECT id FROM votes WHERE proposal_id = ? AND voter_id = ?'
    ).get(req.params.id, req.user.id);

    if (existingVote) {
      return res.status(400).json({ error: '您已经对该提案投过票' });
    }

    // 插入投票
    db.prepare(`
      INSERT INTO votes (proposal_id, voter_id, vote, weight)
      VALUES (?, ?, ?, 1)
    `).run(req.params.id, req.user.id, vote);

    // 统计投票结果
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_votes,
        SUM(CASE WHEN vote = 'approve' THEN 1 ELSE 0 END) as approve_count
      FROM votes
      WHERE proposal_id = ?
    `).get(req.params.id);

    const { total_votes, approve_count } = stats;
    const majority = Math.ceil(total_votes / 2);

    // 如果赞成票达到多数，自动批准并应用变更
    if (approve_count >= majority) {
      db.prepare(`
        UPDATE proposals SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(req.params.id);

      // 应用变更
      const changes = JSON.parse(proposal.proposed_changes || '{}');

      if (proposal.target_type === 'character') {
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
          changes.name || null,
          changes.description || null,
          changes.celestial_type || null,
          changes.mass || null,
          changes.traits ? JSON.stringify(changes.traits) : null,
          changes.goals ? JSON.stringify(changes.goals) : null,
          changes.backstory || null,
          proposal.target_id
        );
      } else if (proposal.target_type === 'universe') {
        db.prepare(`
          UPDATE universes
          SET name = COALESCE(?, name),
              description = COALESCE(?, description),
              rules = COALESCE(?, rules),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          changes.name || null,
          changes.description || null,
          changes.rules || null,
          proposal.target_id
        );
      } else if (proposal.target_type === 'relationship') {
        db.prepare(`
          UPDATE relationships
          SET type = COALESCE(?, type),
              strength = COALESCE(?, strength),
              description = COALESCE(?, description),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          changes.type || null,
          changes.strength || null,
          changes.description || null,
          proposal.target_id
        );
      }

      // 记录变更历史
      db.prepare(`
        INSERT INTO history (entity_type, entity_id, action, before_state, after_state, trigger_type, trigger_id, user_id)
        VALUES (?, ?, 'update', ?, ?, 'proposal', ?, ?)
      `).run(
        proposal.target_type,
        proposal.target_id,
        proposal.proposed_changes,
        JSON.stringify(changes),
        proposal.id,
        req.user.id
      );
    }

    const updatedProposal = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = p.id AND vote = 'approve') as approve_count,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = p.id AND vote = 'reject') as reject_count
      FROM proposals p
      WHERE p.id = ?
    `).get(req.params.id);

    res.json({ proposal: updatedProposal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取提案详情
router.get('/:id', (req, res) => {
  try {
    const proposal = db.prepare(`
      SELECT p.*,
        u.username as proposer_name,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = p.id AND vote = 'approve') as approve_count,
        (SELECT COUNT(*) FROM votes WHERE proposal_id = p.id AND vote = 'reject') as reject_count
      FROM proposals p
      LEFT JOIN users u ON u.id = p.proposer_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!proposal) {
      return res.status(404).json({ error: '提案不存在' });
    }

    // 获取当前用户的投票（如果有）
    let userVote = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cronus-secret');
        userVote = db.prepare(
          'SELECT vote FROM votes WHERE proposal_id = ? AND voter_id = ?'
        ).get(req.params.id, decoded.id);
      } catch (e) {
        // 未登录或 token 无效，忽略
      }
    }

    res.json({ proposal, userVote: userVote ? userVote.vote : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
