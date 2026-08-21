/**
 * 种子脚本 — 创建测试宇宙「星陨王朝」
 * 用法: cd packages/server && node seed.js
 */
const db = require('./src/db');

console.log('🌌 开始创建测试宇宙...\n');

// ========== 清理旧数据 ==========
const tables = [
  'notifications', 'ai_sessions', 'event_characters', 'events',
  'character_episodes', 'votes', 'proposals', 'history',
  'episodes', 'arcs', 'relationships', 'characters', 'universes', 'users'
];
for (const t of tables) db.exec(`DELETE FROM ${t}`);
db.exec("DELETE FROM sqlite_sequence");
console.log('✅ 已清理旧数据\n');

// ========== 1. 用户 ==========
console.log('👤 创建用户...');
const insertUser = db.prepare(`
  INSERT INTO users (username, email, password_hash, reputation_score)
  VALUES (?, ?, ?, ?)
`);

const users = [
  { username: '织梦者', email: 'dreamer@test.com', hash: '$2a$10$fakehash001', rep: 120 },
  { username: '星轨', email: 'orbit@test.com', hash: '$2a$10$fakehash002', rep: 85 },
  { username: '暗物质', email: 'dark@test.com', hash: '$2a$10$fakehash003', rep: 60 },
  { username: '超新星', email: 'nova@test.com', hash: '$2a$10$fakehash004', rep: 200 },
];

const userIds = users.map(u => {
  const r = insertUser.run(u.username, u.email, u.hash, u.rep);
  console.log(`  ${u.username} (ID: ${r.lastInsertRowid})`);
  return r.lastInsertRowid;
});

// ========== 2. 宇宙 ==========
console.log('\n🌌 创建宇宙...');
const insertUniverse = db.prepare(`
  INSERT INTO universes (name, description, rules, creator_id)
  VALUES (?, ?, ?, ?)
`);

const universe = insertUniverse.run(
  '星陨王朝',
  '在一个被引力法则支配的宇宙中，星际帝国「星陨王朝」的权力斗争正在上演。恒星贵族掌控核心权力，行星将军们各怀鬼胎，而一颗神秘的彗星即将打破一切平衡……',
  JSON.stringify({
    max_characters: 20,
    gravity_enabled: true,
    voting_threshold: 0.5,
    era: '星历 2847 年'
  }),
  userIds[0]
);
const universeId = universe.lastInsertRowid;
console.log(`  星陨王朝 (ID: ${universeId})`);

// ========== 3. 角色 ==========
console.log('\n⭐ 创建角色...');
const insertChar = db.prepare(`
  INSERT INTO characters (name, description, celestial_type, universe_id, creator_id, mass, traits, goals, backstory)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const characters = [
  {
    name: '凌霄', desc: '星陨王朝的年轻帝王，表面温和实则心机深沉。掌握王朝最高权力，却深陷对已故皇后的执念中无法自拔。',
    type: 'star', mass: 10,
    traits: ['深谋远虑', '外柔内刚', '执念深重', '帝王威仪'],
    goals: ['统一天下', '复活亡妻', '铲除异己'],
    backstory: '幼年丧母，少年登基。凭借铁血手腕平定三王之乱，却在皇后病逝后性情大变，开始追寻禁忌的引力秘术。'
  },
  {
    name: '苏挽歌', desc: '王朝第一女将军，凌霄的青梅竹马。以「行星」之姿守护王朝边疆，暗中深爱凌霄却从未表白。',
    type: 'planet', mass: 7,
    traits: ['刚毅果决', '忠贞不渝', '武艺超群', '外冷内热'],
    goals: ['守护王朝', '保护凌霄', '找到自己的归属'],
    backstory: '出身没落贵族，幼年被凌霄救于战火。从此立誓效忠，一步步从侍女升至将军，成为王朝最锋利的剑。'
  },
  {
    name: '顾长渊', desc: '丞相之子，朝中新贵。以儒雅外表掩盖勃勃野心，暗中联络各方势力意图颠覆皇权。',
    type: 'planet', mass: 6,
    traits: ['风度翩翩', '野心勃勃', '善于伪装', '棋局高手'],
    goals: ['夺取皇位', '建立新秩序', '击败凌霄'],
    backstory: '丞相府嫡长子，自幼饱读诗书却屡遭凌霄打压。表面恭敬，内心早已将凌霄视为必须铲除的障碍。'
  },
  {
    name: '白夜', desc: '来历不明的神秘旅人，自称来自「引力之外」。拥有不可思议的预知能力，一言一行都能改变命运走向。',
    type: 'comet', mass: 8,
    traits: ['神秘莫测', '洞察人心', '亦正亦邪', '超然物外'],
    goals: ['完成某个使命', '找到回去的路', '搅动天下大势'],
    backstory: '无人知晓白夜从何而来。有人说他是被放逐的神，有人说他是未来穿越而来的亡魂。唯一确定的是，他出现之处必有巨变。'
  },
  {
    name: '小满', desc: '御膳房的小宫女，天真烂漫。一次偶然目睹了不该看到的秘密，从此被卷入宫廷漩涡。',
    type: 'meteor', mass: 2,
    traits: ['天真善良', '胆小怕事', '观察力强', '命运多舛'],
    goals: ['活下去', '保护朋友', '揭露真相'],
    backstory: '乡下农户之女，因家乡遭灾入宫为奴。本只想安安稳稳度日，却因一次偷听改变了命运轨迹。'
  },
  {
    name: '沈墨', desc: '暗卫统领，凌霄最信任的影子。沉默寡言，手段狠辣，掌握着王朝所有不可告人的秘密。',
    type: 'planet', mass: 5,
    traits: ['沉默寡言', '忠诚如铁', '手段残忍', '内心矛盾'],
    goals: ['完成任务', '保护凌霄', '寻找失散的妹妹'],
    backstory: '孤儿出身，被凌霄亲手训练为暗卫。为凌霄挡过三次致命刺杀，是王朝最锋利也最沉默的刀。'
  },
  {
    name: '凤凰密卷', desc: '传说中记载引力终极秘密的古老典籍。谁拥有它，谁就能掌控整个宇宙的命运。多方势力正在疯狂争夺。',
    type: 'black_hole', mass: 9,
    traits: ['万众瞩目', '致命诱惑', '改变命运', '毁灭与重生'],
    goals: ['被找到', '选择合适的继承者'],
    backstory: '据说是第一代引力之神留下的遗物，记载着操控引力法则的终极奥秘。千年间数次易主，每次都带来腥风血雨。'
  },
  {
    name: '柳如烟', desc: '顾长渊的红颜知己，青楼花魁。表面是顾长渊的情报网核心，实际上暗中效忠于另一股势力。',
    type: 'comet', mass: 4,
    traits: ['风情万种', '心思缜密', '双面间谍', '身不由己'],
    goals: ['自由', '复仇', '找到真相'],
    backstory: '原是将门之后，家族被灭后沦落风尘。以花魁身份为掩护，实为双面间谍，在各方势力间游走。'
  },
];

const charIds = characters.map(c => {
  const r = insertChar.run(
    c.name, c.desc, c.type, universeId, userIds[0],
    c.mass, JSON.stringify(c.traits), JSON.stringify(c.goals), c.backstory
  );
  console.log(`  ${c.type === 'star' ? '⭐' : c.type === 'planet' ? '🪐' : c.type === 'comet' ? '☄️' : c.type === 'meteor' ? '🌠' : '🕳️'} ${c.name} (ID: ${r.lastInsertRowid}, 质量: ${c.mass})`);
  return r.lastInsertRowid;
});

// ========== 4. 引力关系 ==========
console.log('\n🔗 创建引力关系...');
const insertRel = db.prepare(`
  INSERT INTO relationships (character_a_id, character_b_id, type, strength, description)
  VALUES (?, ?, ?, ?, ?)
`);

const relationships = [
  { a: 0, b: 1, type: 'attraction', strength: 9, desc: '青梅竹马，暗藏深情' },
  { a: 0, b: 2, type: 'repulsion', strength: 8, desc: '帝王与权臣，表面君臣实为死敌' },
  { a: 0, b: 3, type: 'orbit', strength: 7, desc: '亦敌亦友，互相试探' },
  { a: 0, b: 5, type: 'attraction', strength: 6, desc: '主仆信任，生死与共' },
  { a: 1, b: 5, type: 'orbit', strength: 5, desc: '战场搭档，互相尊重' },
  { a: 1, b: 2, type: 'repulsion', strength: 4, desc: '立场对立，暗中交锋' },
  { a: 2, b: 7, type: 'attraction', strength: 7, desc: '利益同盟，互相利用' },
  { a: 3, b: 6, type: 'orbit', strength: 8, desc: '白夜被密卷吸引，命运交织' },
  { a: 4, b: 5, type: 'orbit', strength: 3, desc: '小满无意中发现了沈墨的秘密' },
  { a: 6, b: 0, type: 'attraction', strength: 10, desc: '凌霄疯狂追寻密卷' },
  { a: 7, b: 2, type: 'collision', strength: 6, desc: '如烟与长渊的危险关系' },
  { a: 3, b: 1, type: 'orbit', strength: 4, desc: '白夜对挽歌的预言暗示' },
];

relationships.forEach(r => {
  insertRel.run(charIds[r.a], charIds[r.b], r.type, r.strength, r.desc);
  console.log(`  ${characters[r.a].name} —[${r.type}]→ ${characters[r.b].name} (强度: ${r.strength})`);
});

// ========== 5. 故事弧与剧集 ==========
console.log('\n📖 创建故事弧...');
const insertArc = db.prepare(`
  INSERT INTO arcs (name, description, universe_id, season_number)
  VALUES (?, ?, ?, ?)
`);

const insertEp = db.prepare(`
  INSERT INTO episodes (title, description, sequence_number, arc_id, duration_seconds)
  VALUES (?, ?, ?, ?, ?)
`);

// 弧1
const arc1 = insertArc.run('暗流涌动', '白夜的到来打破了王朝表面的平静，各方势力开始暗中角力。', universeId, 1);
const arc1Id = arc1.lastInsertRowid;
console.log(`  S1: 暗流涌动 (ID: ${arc1Id})`);

const arc1Eps = [
  { title: '不速之客', desc: '白夜出现在皇城门前，准确预言了一场即将到来的地震。', seq: 1, dur: 120 },
  { title: '宫宴惊变', desc: '凌霄设宴试探白夜，小满在御膳房偷听到一段不该听的对话。', seq: 2, dur: 110 },
  { title: '暗卫出动', desc: '沈墨奉命调查白夜来历，却发现白夜似乎早已预料到一切。', seq: 3, dur: 115 },
  { title: '丞相密室', desc: '顾长渊与柳如烟密谋，一份关于凤凰密卷的古地图浮出水面。', seq: 4, dur: 130 },
  { title: '将星归位', desc: '苏挽歌接到密召回京，边疆战事却突然吃紧。', seq: 5, dur: 125 },
];

arc1Eps.forEach(ep => {
  insertEp.run(ep.title, ep.desc, ep.seq, arc1Id, ep.dur);
  console.log(`    E${ep.seq}: ${ep.title} (${ep.dur}s)`);
});

// 弧2
const arc2 = insertArc.run('引力风暴', '凤凰密卷的线索引发多方争夺，王朝陷入前所未有的危机。', universeId, 2);
const arc2Id = arc2.lastInsertRowid;
console.log(`\n  S2: 引力风暴 (ID: ${arc2Id})`);

const arc2Eps = [
  { title: '密卷碎片', desc: '白夜透露密卷第一块碎片的下落，各方势力涌向禁忌之地。', seq: 1, dur: 120 },
  { title: '生死一线', desc: '凌霄亲赴险境，苏挽歌以身挡箭，两人的关系出现微妙变化。', seq: 2, dur: 135 },
  { title: '叛徒现身', desc: '沈墨发现暗卫中有内奸，调查指向一个令人震惊的方向。', seq: 3, dur: 120 },
  { title: '花魁之泪', desc: '柳如烟的真实身份被顾长渊察觉，一场信任危机爆发。', seq: 4, dur: 110 },
  { title: '星陨之夜', desc: '一颗流星划破夜空，白夜留下最后的预言后消失无踪。', seq: 5, dur: 140 },
];

arc2Eps.forEach(ep => {
  insertEp.run(ep.title, ep.desc, ep.seq, arc2Id, ep.dur);
  console.log(`    E${ep.seq}: ${ep.title} (${ep.dur}s)`);
});

// ========== 6. 事件 ==========
console.log('\n📡 创建事件...');
const insertEvent = db.prepare(`
  INSERT INTO events (name, description, event_type, episode_id, universe_id)
  VALUES (?, ?, ?, ?, ?)
`);

const insertEC = db.prepare(`
  INSERT INTO event_characters (event_id, character_id, impact_description)
  VALUES (?, ?, ?)
`);

const events = [
  { name: '皇城地震', desc: '白夜预言的地震如期而至，朝野震动。', type: 'signal', epId: null, chars: [{ci: 3, impact: '成功预言，声望大增'}, {ci: 0, impact: '开始关注白夜'}] },
  { name: '宫宴毒酒', desc: '宴会上有人在凌霄酒中下毒，被沈墨及时发现。', type: 'signal', epId: null, chars: [{ci: 0, impact: '险些丧命，更加多疑'}, {ci: 5, impact: '再次救驾，地位稳固'}] },
  { name: '市井谣言', desc: '坊间流传凌霄修炼禁术的谣言，来源不明。', type: 'noise', epId: null, chars: [{ci: 0, impact: '名声受损'}] },
  { name: '边疆小胜', desc: '苏挽歌在边境击退小股入侵，战报传回京城。', type: 'signal', epId: null, chars: [{ci: 1, impact: '军功累积'}] },
  { name: '宫女失踪', desc: '御膳房一名宫女突然失踪，无人在意。', type: 'noise', epId: null, chars: [{ci: 4, impact: '感到不安'}] },
  { name: '密卷线索', desc: '白夜透露凤凰密卷碎片藏于禁地，引发朝堂震动。', type: 'signal', epId: null, chars: [{ci: 3, impact: '抛出关键信息'}, {ci: 6, impact: '成为争夺焦点'}] },
  { name: '花魁选秀', desc: '柳如烟参加花魁选秀，暗中传递情报。', type: 'noise', epId: null, chars: [{ci: 7, impact: '掩护身份'}] },
];

events.forEach(ev => {
  const r = insertEvent.run(ev.name, ev.desc, ev.type, ev.epId, universeId);
  const evId = r.lastInsertRowid;
  console.log(`  ${ev.type === 'signal' ? '📡' : '📢'} ${ev.name} (ID: ${evId})`);
  ev.chars.forEach(c => {
    insertEC.run(evId, charIds[c.ci], c.impact);
  });
});

// ========== 7. 提案 ==========
console.log('\n📋 创建提案...');
const insertProposal = db.prepare(`
  INSERT INTO proposals (title, description, proposer_id, universe_id, target_type, target_id, proposed_changes, status, voting_end_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertVote = db.prepare(`
  INSERT INTO votes (proposal_id, voter_id, vote, weight)
  VALUES (?, ?, ?, ?)
`);

// 提案1：已通过
const p1 = insertProposal.run(
  '提升凌霄的帝王气质', '建议增加凌霄的「铁血手腕」特质，强化其帝王形象。',
  userIds[1], universeId, 'character', charIds[0],
  JSON.stringify({ traits: ['深谋远虑', '外柔内刚', '执念深重', '帝王威仪', '铁血手腕'] }),
  'approved', null
);
const p1Id = p1.lastInsertRowid;
insertVote.run(p1Id, userIds[0], 'approve', 1);
insertVote.run(p1Id, userIds[1], 'approve', 1);
insertVote.run(p1Id, userIds[2], 'approve', 1);
console.log(`  提案 #${p1Id}: 已通过 ✅ (3票赞成)`);

// 提案2：投票中
const p2 = insertProposal.run(
  '苏挽歌升格为恒星', '随着剧情发展，苏挽歌已成为核心角色，建议从行星升格为恒星。',
  userIds[2], universeId, 'character', charIds[1],
  JSON.stringify({ celestial_type: 'star', mass: 9 }),
  'pending', '2026-09-01T00:00:00Z'
);
const p2Id = p2.lastInsertRowid;
insertVote.run(p2Id, userIds[0], 'approve', 1);
insertVote.run(p2Id, userIds[1], 'reject', 1);
console.log(`  提案 #${p2Id}: 投票中 ⏳ (1赞成 1反对)`);

// 提案3：已拒绝
const p3 = insertProposal.run(
  '删除小满角色', '流星角色过多，建议精简。',
  userIds[3], universeId, 'character', charIds[4],
  JSON.stringify({ name: '[已删除]' }),
  'rejected', null
);
const p3Id = p3.lastInsertRowid;
insertVote.run(p3Id, userIds[0], 'reject', 1);
insertVote.run(p3Id, userIds[1], 'reject', 1);
insertVote.run(p3Id, userIds[2], 'reject', 1);
insertVote.run(p3Id, userIds[3], 'approve', 1);
console.log(`  提案 #${p3Id}: 已拒绝 ❌ (1赞成 3反对)`);

// ========== 8. 变更历史 ==========
console.log('\n📜 创建变更历史...');
const insertHistory = db.prepare(`
  INSERT INTO history (entity_type, entity_id, action, before_state, after_state, trigger_type, trigger_id, user_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertHistory.run('character', charIds[0], 'update',
  JSON.stringify({ traits: ['深谋远虑', '外柔内刚', '执念深重', '帝王威仪'] }),
  JSON.stringify({ traits: ['深谋远虑', '外柔内刚', '执念深重', '帝王威仪', '铁血手腕'] }),
  'proposal', p1Id, userIds[1]
);
console.log('  角色「凌霄」属性更新（通过提案 #${p1Id}）');

insertHistory.run('character', charIds[3], 'create', null,
  JSON.stringify({ name: '白夜', type: 'comet' }),
  'manual', null, userIds[0]
);
console.log('  角色「白夜」创建');

insertHistory.run('universe', universeId, 'create', null,
  JSON.stringify({ name: '星陨王朝' }),
  'manual', null, userIds[0]
);
console.log('  宇宙「星陨王朝」创建');

// ========== 汇总 ==========
console.log('\n' + '='.repeat(50));
console.log('🌌 测试宇宙「星陨王朝」创建完成！');
console.log('='.repeat(50));
console.log(`
  用户: ${users.length} 个
  宇宙: 1 个 (星陨王朝)
  角色: ${characters.length} 个
    ⭐ 恒星: ${characters.filter(c=>c.type==='star').length} (凌霄)
    🪐 行星: ${characters.filter(c=>c.type==='planet').length} (苏挽歌、顾长渊、沈墨)
    ☄️ 彗星: ${characters.filter(c=>c.type==='comet').length} (白夜、柳如烟)
    🌠 流星: ${characters.filter(c=>c.type==='meteor').length} (小满)
    🕳️ 黑洞: ${characters.filter(c=>c.type==='black_hole').length} (凤凰密卷)
  关系: ${relationships.length} 条 (吸引${relationships.filter(r=>r.type==='attraction').length} 排斥${relationships.filter(r=>r.type==='repulsion').length} 轨道${relationships.filter(r=>r.type==='orbit').length} 碰撞${relationships.filter(r=>r.type==='collision').length})
  弧: 2 个 (暗流涌动S1·5集、引力风暴S2·5集)
  剧集: 10 集
  事件: ${events.length} 个 (信号${events.filter(e=>e.type==='signal').length} 噪音${events.filter(e=>e.type==='noise').length})
  提案: 3 个 (已通过1 投票中1 已拒绝1)
  变更历史: 3 条

启动服务器后打开前端即可查看：
  cd packages/server && npm run dev
  open packages/web/index.html
`);
