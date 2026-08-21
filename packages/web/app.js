// 生产环境：Express serve 前端，使用同源 /api
// 开发环境：直接打开 HTML 文件，指向 localhost:3001
const API_BASE = window.location.protocol === 'file:'
  ? 'http://localhost:3001/api'
  : window.location.origin + '/api';

// ========== 状态管理 ==========
let currentUser = null;
let token = localStorage.getItem('token');
let currentUniverseId = null;

// ========== API 调用 ==========
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// ========== 工具函数 ==========
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${type === 'error' ? 'bg-red-800 border border-red-700' : 'bg-gray-800 border border-gray-700'}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

const typeEmoji = { star: '⭐', planet: '🪐', comet: '☄️', meteor: '🌠', black_hole: '🕳️' };
const typeLabel = { star: '恒星', planet: '行星', comet: '彗星', meteor: '流星', black_hole: '黑洞' };
const relTypeMap = { attraction: '吸引', repulsion: '排斥', orbit: '轨道', collision: '碰撞' };
const relColor = { attraction: 'text-green-400', repulsion: 'text-red-400', orbit: 'text-blue-400', collision: 'text-yellow-400' };

// ========== 页面切换 ==========
function showPage(page, params = {}) {
  document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.remove('hidden');

  switch (page) {
    case 'home': break;
    case 'universes': loadUniverses(); break;
    case 'universe-detail': loadUniverseDetail(params.id); break;
    case 'create-character':
      document.getElementById('char-universe-id').value = params.universeId;
      break;
    case 'proposals': loadProposals(); break;
    case 'create-proposal':
      document.getElementById('proposal-universe-id').value = currentUniverseId;
      break;
    case 'character-detail': loadCharacterDetail(params.id); break;
  }
}

// ========== 认证 ==========
function updateNav() {
  if (currentUser) {
    document.getElementById('nav-auth').classList.add('hidden');
    document.getElementById('nav-user').classList.remove('hidden');
    document.getElementById('nav-username').textContent = currentUser.username;
  } else {
    document.getElementById('nav-auth').classList.remove('hidden');
    document.getElementById('nav-user').classList.add('hidden');
  }
}

function requireAuth(callback) {
  if (!currentUser) {
    showToast('请先登录');
    showPage('login');
    return;
  }
  callback();
}

function logout() {
  currentUser = null;
  token = null;
  localStorage.removeItem('token');
  updateNav();
  showPage('home');
  showToast('已退出登录');
}

// ========== 登录/注册 ==========
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    updateNav();
    showPage('home');
    showToast('登录成功');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('register-username').value,
        email: document.getElementById('register-email').value,
        password: document.getElementById('register-password').value
      })
    });
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    updateNav();
    showPage('home');
    showToast('注册成功');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ========== 宇宙列表 ==========
async function loadUniverses() {
  try {
    const data = await api('/universes');
    const list = document.getElementById('universe-list');

    if (data.universes.length === 0) {
      list.innerHTML = '<div class="text-center text-gray-400 py-12">还没有宇宙，创建第一个吧！</div>';
      return;
    }

    list.innerHTML = data.universes.map(u => `
      <div onclick="showPage('universe-detail', {id: ${u.id}})" class="bg-gray-900 border border-gray-800 rounded-lg p-6 cursor-pointer hover:border-purple-500 transition-colors">
        <h3 class="text-lg font-bold mb-2">${escapeHtml(u.name)}</h3>
        <p class="text-gray-400 text-sm mb-3">${escapeHtml(u.description || '暂无描述')}</p>
        <div class="flex items-center gap-4 text-sm text-gray-500">
          <span>角色 ${u.character_count || 0}</span>
          <span>创建于 ${new Date(u.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('create-universe-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/universes', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('universe-name').value,
        description: document.getElementById('universe-desc').value
      })
    });
    showPage('universes');
    showToast('宇宙创建成功');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ========== 宇宙详情 + Tabs ==========
let galaxyEngine = null;

function switchUniverseTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  // 按需加载 tab 内容
  switch (tab) {
    case 'characters': loadCharacters(); break;
    case 'relationships': loadRelationships(); break;
    case 'arcs': loadArcs(); break;
    case 'events': loadEvents(); break;
    case 'history': loadHistory(); break;
  }
}

async function loadUniverseDetail(id) {
  try {
    currentUniverseId = id;
    const data = await api(`/universes/${id}`);
    const u = data.universe;

    document.getElementById('universe-header').innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <a onclick="showPage('universes')" class="text-purple-400 text-sm cursor-pointer hover:underline">← 返回列表</a>
          <h2 class="text-2xl font-bold mt-2">${escapeHtml(u.name)}</h2>
          <p class="text-gray-400 text-sm mt-1">${escapeHtml(u.description || '')}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="requireAuth(() => showPage('create-character', {universeId: ${id}}))" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">+ 添加角色</button>
          <button onclick="forkUniverse(${id}, '${escapeHtml(u.name)}')" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">🔱 Fork</button>
          <button onclick="exportChronicle(${id})" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">📜 导出编年史</button>
        </div>
      </div>
    `;

    // 重置到角色 tab
    switchUniverseTab('characters');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadCharacters() {
  try {
    const [charData, galaxyData] = await Promise.all([
      api(`/characters/universe/${currentUniverseId}`),
      api(`/characters/galaxy/${currentUniverseId}`)
    ]);

    const list = document.getElementById('character-list');
    const characters = charData.characters || [];

    if (characters.length === 0) {
      list.innerHTML = '<div class="text-center text-gray-400 py-8">还没有角色</div>';
      document.getElementById('galaxy-container').classList.add('hidden');
      return;
    }

    // Galaxy
    if (galaxyData.nodes.length > 0) {
      document.getElementById('galaxy-container').classList.remove('hidden');
      if (galaxyEngine) galaxyEngine.destroy();
      galaxyEngine = new GalaxyEngine('galaxy-canvas');
      galaxyEngine.onNodeSelect = (node) => showNodeDetail(node, galaxyData.edges);
      galaxyEngine.setData(galaxyData.nodes, galaxyData.edges);
    } else {
      document.getElementById('galaxy-container').classList.add('hidden');
    }

    list.innerHTML = `
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        ${characters.map(c => `
          <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-purple-500 transition-colors">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">${typeEmoji[c.celestial_type] || ''}</span>
              <span class="font-medium cursor-pointer text-purple-400 hover:underline" onclick="showPage('character-detail', {id: ${c.id}})">${escapeHtml(c.name)}</span>
              <span class="text-xs text-gray-500 ml-auto">质量 ${c.mass}</span>
            </div>
            <p class="text-gray-400 text-sm">${escapeHtml((c.description || '').slice(0, 80))}${(c.description || '').length > 80 ? '...' : ''}</p>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showNodeDetail(node, edges) {
  const panel = document.getElementById('node-detail');
  panel.classList.remove('hidden');
  const connected = edges.filter(e => e.source === node.id || e.target === node.id);
  panel.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">${typeEmoji[node.celestial_type] || ''}</span>
      <div>
        <h4 class="font-bold">${escapeHtml(node.name)}</h4>
        <span class="text-sm text-gray-400">${typeLabel[node.celestial_type] || node.celestial_type} · 质量 ${node.mass}</span>
        ${node.has_evolution ? '<span class="ml-2 text-xs text-yellow-400">✦ 已演化</span>' : ''}
      </div>
      <button onclick="showPage('character-detail', {id: ${node.id}})" class="ml-auto px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">查看详情</button>
    </div>
    ${node.description ? `<p class="text-gray-300 text-sm mb-3">${escapeHtml(node.description)}</p>` : ''}
    ${connected.length > 0 ? `
      <div class="text-sm text-gray-400">
        <span class="font-medium">关系：</span>
        ${connected.map(e => {
          const otherId = e.source === node.id ? e.target : e.source;
          return `<span class="${relColor[e.type]}">${relTypeMap[e.type]}</span> → ID ${otherId}（强度 ${e.strength}）`;
        }).join('、')}
      </div>
    ` : ''}
  `;
}

// ========== Fork 宇宙 ==========
async function forkUniverse(id, originalName) {
  try {
    const data = await api(`/universes/${id}/fork`, { method: 'POST', body: '{}' });
    showToast(`宇宙已复制！${data.stats.characters_copied} 个角色，${data.stats.relationships_copied} 条关系`);
    showPage('universe-detail', { id: data.universe.id });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 导出编年史 ==========
async function exportChronicle(id) {
  try {
    const data = await api(`/universes/${id}/export`);
    const blob = new Blob([data.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.universe}-编年史.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`编年史已导出！${data.stats.characters} 个角色，${data.stats.relationships} 条关系`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 角色创建 ==========
document.getElementById('create-character-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/characters', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('char-name').value,
        celestial_type: document.getElementById('char-type').value,
        universe_id: parseInt(document.getElementById('char-universe-id').value),
        mass: parseInt(document.getElementById('char-mass').value) || 1,
        description: document.getElementById('char-desc').value,
        backstory: document.getElementById('char-backstory').value
      })
    });
    showPage('universe-detail', { id: parseInt(document.getElementById('char-universe-id').value) });
    showToast('角色创建成功');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ========== 引力关系管理 ==========
async function loadRelationships() {
  try {
    const [relData, charData] = await Promise.all([
      api(`/characters/relationships/${currentUniverseId}`),
      api(`/characters/universe/${currentUniverseId}`)
    ]);
    const relationships = relData.relationships || [];
    const characters = charData.characters || [];
    const container = document.getElementById('tab-relationships');

    container.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">引力关系</h3>
        <button onclick="requireAuth(() => showRelForm(${JSON.stringify(characters).replace(/"/g, '&quot;')}))" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">+ 创建关系</button>
      </div>
      <div id="rel-form-container"></div>
      <div id="rel-list" class="space-y-2">
        ${relationships.length === 0 ? '<p class="text-gray-500 text-sm py-4">暂无关系</p>' :
          relationships.map(r => `
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4">
              <span class="text-lg">${typeEmoji[r.character_a_type] || ''}</span>
              <span class="font-medium">${escapeHtml(r.character_a_name)}</span>
              <span class="${relColor[r.type]} px-2 py-1 rounded bg-gray-800 text-xs">${relTypeMap[r.type]}</span>
              <span class="text-lg">${typeEmoji[r.character_b_type] || ''}</span>
              <span class="font-medium">${escapeHtml(r.character_b_name)}</span>
              <span class="text-gray-500 text-sm ml-auto">强度 ${r.strength}</span>
              ${r.description ? `<span class="text-gray-400 text-sm">${escapeHtml(r.description)}</span>` : ''}
              <div class="flex gap-1 ml-2">
                <button onclick="requireAuth(() => editRelForm(${r.id}, ${JSON.stringify(characters).replace(/"/g, '&quot;')}, '${r.type}', ${r.strength}, '${escapeHtml(r.description || '')}', ${r.character_a_id}, ${r.character_b_id}))" class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">编辑</button>
                <button onclick="requireAuth(() => deleteRel(${r.id}))" class="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded">删除</button>
              </div>
            </div>
          `).join('')}
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showRelForm(characters, editId, editA, editB, editType, editStrength, editDesc) {
  const container = document.getElementById('rel-form-container');
  container.innerHTML = `
    <div class="bg-gray-900 border border-purple-500 rounded-lg p-4 mb-4">
      <h4 class="font-medium mb-3">${editId ? '编辑关系' : '创建关系'}</h4>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <select id="rel-char-a" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
          ${characters.map(c => `<option value="${c.id}" ${c.id === editA ? 'selected' : ''}>${typeEmoji[c.celestial_type]} ${escapeHtml(c.name)}</option>`).join('')}
        </select>
        <select id="rel-char-b" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
          ${characters.map(c => `<option value="${c.id}" ${c.id === editB ? 'selected' : ''}>${typeEmoji[c.celestial_type]} ${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="grid grid-cols-3 gap-3 mb-3">
        <select id="rel-type" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
          <option value="attraction" ${editType === 'attraction' ? 'selected' : ''}>吸引</option>
          <option value="repulsion" ${editType === 'repulsion' ? 'selected' : ''}>排斥</option>
          <option value="orbit" ${editType === 'orbit' ? 'selected' : ''}>轨道</option>
          <option value="collision" ${editType === 'collision' ? 'selected' : ''}>碰撞</option>
        </select>
        <input type="number" id="rel-strength" value="${editStrength || 1}" min="1" max="10" placeholder="强度" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
        <input type="text" id="rel-desc" value="${editDesc || ''}" placeholder="描述" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
      </div>
      <div class="flex gap-2">
        <button onclick="submitRel(${editId || 'null'})" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">${editId ? '保存' : '创建'}</button>
        <button onclick="document.getElementById('rel-form-container').innerHTML=''" class="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded text-sm">取消</button>
      </div>
    </div>
  `;
}

async function submitRel(editId) {
  const payload = {
    character_a_id: parseInt(document.getElementById('rel-char-a').value),
    character_b_id: parseInt(document.getElementById('rel-char-b').value),
    type: document.getElementById('rel-type').value,
    strength: parseInt(document.getElementById('rel-strength').value) || 1,
    description: document.getElementById('rel-desc').value
  };

  if (payload.character_a_id === payload.character_b_id) return showToast('不能和自己建立关系', 'error');

  try {
    if (editId) {
      await api(`/characters/relationships/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('关系已更新');
    } else {
      await api('/characters/relationships', { method: 'POST', body: JSON.stringify(payload) });
      showToast('关系已创建');
    }
    loadRelationships();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editRelForm(id, characters, type, strength, desc, charA, charB) {
  showRelForm(characters, id, charA, charB, type, strength, desc);
}

async function deleteRel(id) {
  if (!confirm('确定删除这条关系？')) return;
  try {
    await api(`/characters/relationships/${id}`, { method: 'DELETE' });
    showToast('关系已删除');
    loadRelationships();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 弧与剧集管理 ==========
async function loadArcs() {
  try {
    const data = await api(`/arcs/universe/${currentUniverseId}`);
    const arcs = data.arcs || [];
    const container = document.getElementById('tab-arcs');

    container.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">故事弧</h3>
        <button onclick="requireAuth(() => showArcForm())" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">+ 创建弧</button>
      </div>
      <div id="arc-form-container"></div>
      <div id="arc-list" class="space-y-4">
        ${arcs.length === 0 ? '<p class="text-gray-500 text-sm py-4">暂无故事弧</p>' :
          arcs.map(a => `
            <div class="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div class="p-4 flex items-center justify-between">
                <div>
                  <h4 class="font-bold">S${a.season_number} · ${escapeHtml(a.name)}</h4>
                  <p class="text-gray-400 text-sm">${escapeHtml(a.description || '')}</p>
                  <span class="text-xs text-gray-500">${a.episode_count || 0} 集</span>
                </div>
                <div class="flex gap-1">
                  <button onclick="requireAuth(() => showArcForm(${a.id}, '${escapeHtml(a.name)}', '${escapeHtml(a.description || '')}', ${a.season_number}))" class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">编辑</button>
                  <button onclick="requireAuth(() => showEpisodeForm(${a.id}))" class="px-2 py-1 text-xs bg-purple-700 hover:bg-purple-600 rounded">+ 剧集</button>
                  <button onclick="requireAuth(() => deleteArc(${a.id}))" class="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded">删除</button>
                </div>
              </div>
              <div id="episodes-${a.id}" class="border-t border-gray-800 px-4 py-2"></div>
            </div>
          `).join('')}
      </div>
    `;

    // 加载每个弧的剧集
    for (const arc of arcs) {
      loadEpisodes(arc.id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadEpisodes(arcId) {
  try {
    const data = await api(`/arcs/${arcId}/episodes`);
    const episodes = data.episodes || [];
    const container = document.getElementById(`episodes-${arcId}`);
    if (!container) return;

    container.innerHTML = episodes.length === 0
      ? '<p class="text-gray-600 text-xs py-1">暂无剧集</p>'
      : episodes.map(ep => `
        <div class="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
          <span class="text-gray-500 text-xs w-8">E${ep.sequence_number}</span>
          <span class="text-sm font-medium flex-1">${escapeHtml(ep.title)}</span>
          <span class="text-gray-500 text-xs">${ep.duration_seconds}s</span>
          <button onclick="requireAuth(() => editEpisodeForm(${arcId}, ${ep.id}, '${escapeHtml(ep.title)}', '${escapeHtml(ep.description || '')}', ${ep.sequence_number}, ${ep.duration_seconds}))" class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">编辑</button>
          <button onclick="requireAuth(() => deleteEpisode(${arcId}, ${ep.id}))" class="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded">删</button>
        </div>
      `).join('');
  } catch (err) {
    console.error('loadEpisodes error:', err);
  }
}

function showArcForm(editId, editName, editDesc, editSeason) {
  const container = document.getElementById('arc-form-container');
  container.innerHTML = `
    <div class="bg-gray-900 border border-purple-500 rounded-lg p-4 mb-4">
      <h4 class="font-medium mb-3">${editId ? '编辑弧' : '创建故事弧'}</h4>
      <div class="grid grid-cols-3 gap-3 mb-3">
        <input type="text" id="arc-name" value="${editName || ''}" placeholder="弧名称" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
        <input type="number" id="arc-season" value="${editSeason || 1}" min="1" placeholder="季" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
        <input type="text" id="arc-desc" value="${editDesc || ''}" placeholder="描述" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
      </div>
      <div class="flex gap-2">
        <button onclick="submitArc(${editId || 'null'})" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">${editId ? '保存' : '创建'}</button>
        <button onclick="document.getElementById('arc-form-container').innerHTML=''" class="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded text-sm">取消</button>
      </div>
    </div>
  `;
}

async function submitArc(editId) {
  const payload = {
    name: document.getElementById('arc-name').value,
    description: document.getElementById('arc-desc').value,
    season_number: parseInt(document.getElementById('arc-season').value) || 1,
    universe_id: currentUniverseId
  };
  try {
    if (editId) {
      await api(`/arcs/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('弧已更新');
    } else {
      await api('/arcs', { method: 'POST', body: JSON.stringify(payload) });
      showToast('弧已创建');
    }
    loadArcs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteArc(id) {
  if (!confirm('确定删除此弧及其所有剧集？')) return;
  try {
    await api(`/arcs/${id}`, { method: 'DELETE' });
    showToast('弧已删除');
    loadArcs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showEpisodeForm(arcId, editId, editTitle, editDesc, editSeq, editDur) {
  const arcContainer = document.getElementById(`episodes-${arcId}`);
  const existing = arcContainer.querySelector('.ep-form');
  if (existing) existing.remove();

  const formDiv = document.createElement('div');
  formDiv.className = 'ep-form bg-gray-800 rounded p-3 mb-2';
  formDiv.innerHTML = `
    <div class="grid grid-cols-4 gap-2 mb-2">
      <input type="text" id="ep-title-${arcId}" value="${editTitle || ''}" placeholder="剧集标题" class="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none">
      <input type="number" id="ep-seq-${arcId}" value="${editSeq || ''}" min="1" placeholder="序号" class="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none">
      <input type="number" id="ep-dur-${arcId}" value="${editDur || 120}" min="10" placeholder="时长(秒)" class="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none">
      <input type="text" id="ep-desc-${arcId}" value="${editDesc || ''}" placeholder="描述" class="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none">
    </div>
    <div class="flex gap-2">
      <button onclick="submitEpisode(${arcId}, ${editId || 'null'})" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs">${editId ? '保存' : '添加'}</button>
      <button onclick="this.parentElement.parentElement.remove()" class="px-3 py-1 border border-gray-700 hover:bg-gray-800 rounded text-xs">取消</button>
    </div>
  `;
  arcContainer.prepend(formDiv);
}

async function submitEpisode(arcId, editId) {
  const payload = {
    title: document.getElementById(`ep-title-${arcId}`).value,
    sequence_number: parseInt(document.getElementById(`ep-seq-${arcId}`).value),
    duration_seconds: parseInt(document.getElementById(`ep-dur-${arcId}`).value) || 120,
    description: document.getElementById(`ep-desc-${arcId}`).value
  };
  try {
    if (editId) {
      await api(`/arcs/${arcId}/episodes/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('剧集已更新');
    } else {
      await api(`/arcs/${arcId}/episodes`, { method: 'POST', body: JSON.stringify(payload) });
      showToast('剧集已添加');
    }
    loadEpisodes(arcId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function editEpisodeForm(arcId, epId, title, desc, seq, dur) {
  showEpisodeForm(arcId, epId, title, desc, seq, dur);
}

async function deleteEpisode(arcId, epId) {
  if (!confirm('确定删除此剧集？')) return;
  try {
    await api(`/arcs/${arcId}/episodes/${epId}`, { method: 'DELETE' });
    showToast('剧集已删除');
    loadEpisodes(arcId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 事件管理 ==========
async function loadEvents() {
  try {
    const data = await api(`/events/universe/${currentUniverseId}`);
    const events = data.events || [];
    const container = document.getElementById('tab-events');

    container.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">事件追踪</h3>
        <button onclick="requireAuth(() => showEventForm())" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">+ 创建事件</button>
      </div>
      <div id="event-form-container"></div>
      <div class="flex gap-2 mb-4">
        <button onclick="filterEvents('')" class="px-3 py-1 text-xs rounded border border-gray-700 hover:bg-gray-800">全部</button>
        <button onclick="filterEvents('signal')" class="px-3 py-1 text-xs rounded border border-green-700 text-green-400 hover:bg-green-900/30">📡 信号</button>
        <button onclick="filterEvents('noise')" class="px-3 py-1 text-xs rounded border border-red-700 text-red-400 hover:bg-red-900/30">📢 噪音</button>
      </div>
      <div id="event-list" class="space-y-3">
        ${events.length === 0 ? '<p class="text-gray-500 text-sm py-4">暂无事件</p>' :
          events.map(ev => `
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="${ev.event_type === 'signal' ? 'text-green-400' : 'text-red-400'}">${ev.event_type === 'signal' ? '📡' : '📢'}</span>
                <span class="font-medium">${escapeHtml(ev.name)}</span>
                <span class="text-xs px-2 py-0.5 rounded ${ev.event_type === 'signal' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}">${ev.event_type}</span>
                <span class="text-xs text-gray-500 ml-auto">${new Date(ev.created_at).toLocaleString('zh-CN')}</span>
                <button onclick="requireAuth(() => deleteEvent(${ev.id}))" class="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded">删除</button>
              </div>
              ${ev.description ? `<p class="text-gray-400 text-sm">${escapeHtml(ev.description)}</p>` : ''}
              ${ev.character_names ? `<p class="text-gray-500 text-xs mt-2">关联角色：${escapeHtml(ev.character_names)}</p>` : ''}
            </div>
          `).join('')}
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showEventForm() {
  const container = document.getElementById('event-form-container');
  container.innerHTML = `
    <div class="bg-gray-900 border border-purple-500 rounded-lg p-4 mb-4">
      <h4 class="font-medium mb-3">创建事件</h4>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <input type="text" id="ev-name" placeholder="事件名称" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
        <select id="ev-type" class="px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm">
          <option value="signal">📡 信号</option>
          <option value="noise">📢 噪音</option>
        </select>
      </div>
      <textarea id="ev-desc" placeholder="事件描述" rows="2" class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:border-purple-500 focus:outline-none text-sm mb-3"></textarea>
      <div class="flex gap-2">
        <button onclick="submitEvent()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">创建</button>
        <button onclick="document.getElementById('event-form-container').innerHTML=''" class="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded text-sm">取消</button>
      </div>
    </div>
  `;
}

async function submitEvent() {
  const payload = {
    name: document.getElementById('ev-name').value,
    event_type: document.getElementById('ev-type').value,
    description: document.getElementById('ev-desc').value,
    universe_id: currentUniverseId
  };
  try {
    await api('/events', { method: 'POST', body: JSON.stringify(payload) });
    showToast('事件已创建');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function filterEvents(type) {
  try {
    const query = type ? `?event_type=${type}` : '';
    const data = await api(`/events/universe/${currentUniverseId}${query}`);
    const events = data.events || [];
    document.getElementById('event-list').innerHTML = events.length === 0
      ? '<p class="text-gray-500 text-sm py-4">暂无事件</p>'
      : events.map(ev => `
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="${ev.event_type === 'signal' ? 'text-green-400' : 'text-red-400'}">${ev.event_type === 'signal' ? '📡' : '📢'}</span>
            <span class="font-medium">${escapeHtml(ev.name)}</span>
            <span class="text-xs px-2 py-0.5 rounded ${ev.event_type === 'signal' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}">${ev.event_type}</span>
            <span class="text-xs text-gray-500 ml-auto">${new Date(ev.created_at).toLocaleString('zh-CN')}</span>
            <button onclick="requireAuth(() => deleteEvent(${ev.id}))" class="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded">删除</button>
          </div>
          ${ev.description ? `<p class="text-gray-400 text-sm">${escapeHtml(ev.description)}</p>` : ''}
          ${ev.character_names ? `<p class="text-gray-500 text-xs mt-2">关联角色：${escapeHtml(ev.character_names)}</p>` : ''}
        </div>
      `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteEvent(id) {
  if (!confirm('确定删除此事件？')) return;
  try {
    await api(`/events/${id}`, { method: 'DELETE' });
    showToast('事件已删除');
    loadEvents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 变更历史 ==========
async function loadHistory() {
  try {
    const data = await api(`/history?universe_id=${currentUniverseId}`);
    const history = data.history || [];
    const container = document.getElementById('tab-history');

    const actionLabel = { create: '创建', update: '更新', delete: '删除' };
    const actionColor = { create: 'text-green-400', update: 'text-blue-400', delete: 'text-red-400' };

    container.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">变更历史</h3>
      </div>
      <div class="space-y-2">
        ${history.length === 0 ? '<p class="text-gray-500 text-sm py-4">暂无变更记录</p>' :
          history.map(h => `
            <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-1">
                <span class="${actionColor[h.action] || 'text-gray-400'} text-xs font-medium px-2 py-0.5 rounded bg-gray-800">${actionLabel[h.action] || h.action}</span>
                <span class="text-sm font-medium">${h.entity_type} #${h.entity_id}</span>
                <span class="text-xs text-gray-500">${h.trigger_type || 'manual'}</span>
                ${h.user_name ? `<span class="text-xs text-gray-500 ml-auto">${escapeHtml(h.user_name)}</span>` : ''}
                <span class="text-xs text-gray-600">${new Date(h.created_at).toLocaleString('zh-CN')}</span>
              </div>
              ${h.before_state ? `<details class="mt-2"><summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-400">变更详情</summary><pre class="text-xs text-gray-400 mt-1 bg-gray-800 rounded p-2 overflow-x-auto">${escapeHtml(h.before_state)} → ${escapeHtml(h.after_state || '')}</pre></details>` : ''}
            </div>
          `).join('')}
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 提案 ==========
async function loadProposals() {
  try {
    const data = await api(`/proposals/universe/${currentUniverseId}`);
    const proposals = data.proposals || [];
    const list = document.getElementById('proposal-list');

    const statusLabel = { pending: '投票中', approved: '已通过', rejected: '已拒绝' };
    const statusColor = { pending: 'text-yellow-400 bg-yellow-900/30', approved: 'text-green-400 bg-green-900/30', rejected: 'text-red-400 bg-red-900/30' };

    list.innerHTML = proposals.length === 0
      ? '<div class="text-center text-gray-400 py-8">暂无提案</div>'
      : proposals.map(p => `
        <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="font-medium">${escapeHtml(p.title)}</span>
            <span class="text-xs px-2 py-0.5 rounded ${statusColor[p.status] || ''}">${statusLabel[p.status] || p.status}</span>
            <span class="text-xs text-gray-500 ml-auto">${p.proposer_name || '匿名'} · ${new Date(p.created_at).toLocaleString('zh-CN')}</span>
          </div>
          ${p.description ? `<p class="text-gray-400 text-sm mb-2">${escapeHtml(p.description)}</p>` : ''}
          <div class="flex items-center gap-4 text-sm">
            <span class="text-green-400">👍 ${p.approve_count || 0}</span>
            <span class="text-red-400">👎 ${p.reject_count || 0}</span>
            <span class="text-gray-500 text-xs">目标: ${p.target_type} #${p.target_id}</span>
          </div>
          ${p.status === 'pending' && currentUser ? `
          <div class="flex gap-2 mt-3">
            <button onclick="voteProposal(${p.id}, 'approve')" class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm">赞成</button>
            <button onclick="voteProposal(${p.id}, 'reject')" class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">反对</button>
          </div>
        ` : ''}
        </div>
      `).join('');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function voteProposal(id, vote) {
  try {
    await api(`/proposals/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote })
    });
    showToast(vote === 'approve' ? '已赞成' : '已反对');
    loadProposals();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('create-proposal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const changesStr = document.getElementById('proposal-changes').value;
    let changes;
    try { changes = JSON.parse(changesStr); } catch { return showToast('JSON 格式错误', 'error'); }

    await api('/proposals', {
      method: 'POST',
      body: JSON.stringify({
        title: document.getElementById('proposal-title').value,
        description: document.getElementById('proposal-desc').value,
        universe_id: currentUniverseId,
        target_type: document.getElementById('proposal-target-type').value,
        target_id: parseInt(document.getElementById('proposal-target-id').value),
        proposed_changes: changes
      })
    });
    showPage('proposals');
    showToast('提案创建成功');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ========== 角色详情 ==========
async function loadCharacterDetail(id) {
  try {
    const data = await api(`/characters/${id}`);
    const c = data.character;
    const relationships = data.relationships || [];

    let traits = [];
    try { traits = JSON.parse(c.traits || '[]'); } catch {}
    let goals = [];
    try { goals = JSON.parse(c.goals || '[]'); } catch {}

    document.getElementById('character-detail-content').innerHTML = `
      <div class="mb-6">
        <a onclick="showPage('universe-detail', {id: ${c.universe_id}})" class="text-purple-400 text-sm cursor-pointer hover:underline">← 返回宇宙</a>
        <div class="flex items-center gap-3 mt-3">
          <span class="text-4xl">${typeEmoji[c.celestial_type]}</span>
          <div>
            <h2 class="text-2xl font-bold">${escapeHtml(c.name)}</h2>
            <span class="text-sm text-gray-400">${typeLabel[c.celestial_type]} · 质量 ${c.mass} · 所属: ${escapeHtml(c.universe_name || '')}</span>
          </div>
        </div>
      </div>

      ${c.description ? `<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4"><h4 class="font-medium mb-2">描述</h4><p class="text-gray-300 text-sm">${escapeHtml(c.description)}</p></div>` : ''}
      ${c.backstory ? `<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4"><h4 class="font-medium mb-2">背景故事</h4><p class="text-gray-300 text-sm">${escapeHtml(c.backstory)}</p></div>` : ''}

      ${traits.length > 0 ? `<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4"><h4 class="font-medium mb-2">属性</h4><div class="flex flex-wrap gap-2">${traits.map(t => `<span class="px-2 py-1 bg-gray-800 rounded text-sm">${escapeHtml(t)}</span>`).join('')}</div></div>` : ''}
      ${goals.length > 0 ? `<div class="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4"><h4 class="font-medium mb-2">目标</h4><div class="flex flex-wrap gap-2">${goals.map(g => `<span class="px-2 py-1 bg-purple-900/50 rounded text-sm">${escapeHtml(g)}</span>`).join('')}</div></div>` : ''}

      <div class="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4">
        <h4 class="font-medium mb-3">引力关系</h4>
        ${relationships.length > 0 ? `<div class="space-y-2">${relationships.map(r => {
          return `<div class="flex items-center gap-2 text-sm">
            <span class="${relColor[r.type]}">${relTypeMap[r.type]}</span>
            <span class="text-gray-300">${escapeHtml(r.other_name)}</span>
            <span class="text-gray-500">(${typeEmoji[r.other_type]} ${typeLabel[r.other_type]})</span>
            <span class="text-gray-600 ml-auto">强度 ${r.strength}</span>
          </div>`;
        }).join('')}</div>` : '<p class="text-gray-500 text-sm">暂无关系</p>'}
      </div>
    `;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 初始化 ==========
if (token) {
  api('/auth/me').then(data => {
    currentUser = data.user;
    updateNav();
  }).catch(() => {
    token = null;
    localStorage.removeItem('token');
  });
}
