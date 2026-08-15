const API_BASE = 'http://localhost:3001/api';

// ========== 状态管理 ==========
let currentUser = null;
let token = localStorage.getItem('token');

// ========== API 调用 ==========
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// ========== 页面切换 ==========
function showPage(page, params = {}) {
  document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');

  // 页面初始化
  switch (page) {
    case 'home': break;
    case 'universes': loadUniverses(); break;
    case 'universe-detail': loadUniverseDetail(params.id); break;
    case 'create-character':
      document.getElementById('char-universe-id').value = params.universeId;
      break;
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

// ========== 宇宙 ==========
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

// ========== 宇宙详情 ==========
let galaxyEngine = null;

async function loadUniverseDetail(id) {
  try {
    const [universeData, charactersData, galaxyData] = await Promise.all([
      api(`/universes/${id}`),
      api(`/characters/universe/${id}`),
      api(`/characters/galaxy/${id}`)
    ]);

    const u = universeData.universe;
    const characters = charactersData.characters;

    // 按天体类型分组
    const grouped = { star: [], planet: [], comet: [], meteor: [], black_hole: [] };
    characters.forEach(c => grouped[c.celestial_type]?.push(c));

    const typeEmoji = { star: '⭐', planet: '🪐', comet: '☄️', meteor: '🌠', black_hole: '🕳️' };
    const typeLabel = { star: '恒星', planet: '行星', comet: '彗星', meteor: '流星', black_hole: '黑洞' };

    document.getElementById('universe-detail-content').innerHTML = `
      <div class="mb-6">
        <h2 class="text-2xl font-bold">${escapeHtml(u.name)}</h2>
        <p class="text-gray-400 mt-2">${escapeHtml(u.description || '')}</p>
      </div>

      <div class="flex flex-wrap gap-3 mb-6">
        <button onclick="requireAuth(() => showPage('create-character', {universeId: ${id}}))" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">+ 添加角色</button>
        <button onclick="forkUniverse(${id}, '${escapeHtml(u.name)}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">🔀 复制宇宙</button>
        <button onclick="exportChronicle(${id})" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm">📄 导出编年史</button>
      </div>

      ${characters.length === 0 ? '<div class="text-center text-gray-400 py-8">还没有角色，添加第一个吧！</div>' : ''}

      ${Object.entries(grouped).map(([type, chars]) => chars.length > 0 ? `
        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-400 mb-3">${typeEmoji[type]} ${typeLabel[type]}</h4>
          <div class="grid gap-3">
            ${chars.map(c => `
              <div class="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div class="flex justify-between items-start">
                  <div>
                    <span class="font-medium">${escapeHtml(c.name)}</span>
                    <span class="text-xs text-gray-500 ml-2">质量 ${c.mass}</span>
                  </div>
                </div>
                ${c.description ? `<p class="text-sm text-gray-400 mt-2">${escapeHtml(c.description)}</p>` : ''}
                ${c.backstory ? `<p class="text-sm text-gray-500 mt-1 italic">${escapeHtml(c.backstory).substring(0, 100)}${c.backstory.length > 100 ? '...' : ''}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : '').join('')}
    `;

    // 初始化 Galaxy Engine
    if (galaxyData.nodes.length > 0) {
      document.getElementById('galaxy-container').classList.remove('hidden');

      if (galaxyEngine) galaxyEngine.destroy();
      galaxyEngine = new GalaxyEngine('galaxy-canvas');

      galaxyEngine.onNodeSelect = (node) => {
        showNodeDetail(node, galaxyData.edges);
      };

      galaxyEngine.setData(galaxyData.nodes, galaxyData.edges);
    } else {
      document.getElementById('galaxy-container').classList.add('hidden');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showNodeDetail(node, edges) {
  const detail = document.getElementById('node-detail');
  const typeEmoji = { star: '⭐', planet: '🪐', comet: '☄️', meteor: '🌠', black_hole: '🕳️' };
  const typeLabel = { star: '恒星', planet: '行星', comet: '彗星', meteor: '流星', black_hole: '黑洞' };

  // 找到与此节点相关的关系
  const relatedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
  const relatedNames = relatedEdges.map(e => {
    const otherId = e.source === node.id ? e.target : e.source;
    const otherNode = galaxyEngine.nodes.find(n => n.id === otherId);
    return otherNode ? otherNode.name : '未知';
  });

  detail.classList.remove('hidden');
  detail.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <span class="text-2xl">${typeEmoji[node.celestial_type]}</span>
      <div>
        <h4 class="font-bold">${escapeHtml(node.name)}</h4>
        <span class="text-sm text-gray-400">${typeLabel[node.celestial_type]} · 质量 ${node.mass}</span>
      </div>
    </div>
    ${node.description ? `<p class="text-sm text-gray-300 mb-2">${escapeHtml(node.description)}</p>` : ''}
    ${relatedEdges.length > 0 ? `
      <div class="text-sm text-gray-400">
        <span class="font-medium">关系：</span>
        ${relatedEdges.map((e, i) => `<span class="text-purple-400">${escapeHtml(relatedNames[i])}</span>（${e.type}）`).join('、')}
      </div>
    ` : '<p class="text-sm text-gray-500">暂无关系</p>'}
  `;
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
        description: document.getElementById('char-desc').value,
        backstory: document.getElementById('char-backstory').value
      })
    });
    history.back();
    showToast('角色创建成功');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ========== Fork 宇宙 ==========
async function forkUniverse(id, originalName) {
  const newName = prompt(`输入分支宇宙名称：`, `${originalName}（分支）`);
  if (!newName) return;

  try {
    showToast('正在复制宇宙...');
    const data = await api(`/universes/${id}/fork`, {
      method: 'POST',
      body: JSON.stringify({ name: newName })
    });
    showToast(`宇宙已复制！${data.stats.characters_copied} 个角色，${data.stats.relationships_copied} 条关系`);
    showPage('universe-detail', { id: data.universe.id });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== 导出编年史 ==========
async function exportChronicle(id) {
  try {
    showToast('正在生成编年史...');
    const data = await api(`/universes/${id}/export`);

    // 创建下载
    const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.universe}-编年史.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`编年史已导出！${data.stats.characters} 个角色，${data.stats.relationships} 条关系`);
  } catch (err) {
    showToast(err.message, 'error');
  }
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
  toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg fade-in ${
    type === 'error' ? 'bg-red-900 border border-red-700 text-red-200' : 'bg-gray-800 border border-gray-700'
  }`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
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
