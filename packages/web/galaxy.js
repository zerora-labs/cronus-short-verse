// Galaxy Engine v4 - 纹理星图
class GalaxyEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    this.hoveredNode = null;
    this.offset = { x: 0, y: 0 };
    this.scale = 1;
    this.isDragging = false;
    this.isDraggingNode = false;
    this.dragNode = null;
    this.dragStart = { x: 0, y: 0 };
    this.time = 0;

    // 纹理缓存
    this.textureCache = {};

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.draw();
  }

  setData(nodes, edges) {
    this.nodes = nodes.map((n, i) => ({
      ...n,
      x: 0, y: 0,
      radius: this.getNodeRadius(n.celestial_type, n.mass),
      pulsePhase: Math.random() * Math.PI * 2,
      tilt: (Math.random() * 0.6 - 0.3) + Math.PI * 0.15 // 行星环随机倾斜角
    }));
    this.edges = edges;

    // 为行星找到最近的恒星作为轨道中心
    this.assignOrbitCenters();

    this.computeEquilibrium();
    this.fitToView();
    this.startAnimation();
  }

  getNodeRadius(type, mass) {
    const base = { star: 24, planet: 16, comet: 12, meteor: 8, black_hole: 26 };
    return (base[type] || 10) + (mass || 1) * 1.5;
  }

  // ========== 轨道中心分配 ==========
  assignOrbitCenters() {
    const stars = this.nodes.filter(n => n.celestial_type === 'star');
    const others = this.nodes.filter(n => n.celestial_type !== 'star');

    for (const node of others) {
      // 通过 attraction 或 orbit 类型的关系找到连接的恒星
      let orbitStar = null;
      for (const edge of this.edges) {
        if (edge.type !== 'attraction' && edge.type !== 'orbit') continue;
        let otherId = null;
        if (edge.source === node.id) otherId = edge.target;
        if (edge.target === node.id) otherId = edge.source;
        if (!otherId) continue;
        const other = this.nodes.find(n => n.id === otherId);
        if (other && other.celestial_type === 'star') {
          orbitStar = other;
          break;
        }
      }
      // 没找到关系则找最近的恒星
      if (!orbitStar && stars.length > 0) {
        let minDist = Infinity;
        for (const s of stars) {
          const d = Math.hypot(node.x - s.x, node.y - s.y);
          if (d < minDist) { minDist = d; orbitStar = s; }
        }
      }
      node._orbitCenter = orbitStar;
    }
  }

  // ========== 平衡位置计算（含碰撞检测） ==========
  computeEquilibrium() {
    const n = this.nodes.length;
    if (n === 0) return;

    // 按质量分层环形分布
    const totalMass = this.nodes.reduce((sum, node) => sum + (node.mass || 1), 0);
    const sorted = [...this.nodes].sort((a, b) => (b.mass || 1) - (a.mass || 1));

    for (let i = 0; i < sorted.length; i++) {
      const node = sorted[i];
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      const massRatio = (node.mass || 1) / totalMass;
      const radius = 100 + massRatio * 500;
      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
    }

    // 力导向迭代
    for (let iter = 0; iter < 120; iter++) {
      for (const node of this.nodes) {
        let fx = 0, fy = 0;

        // 向心力
        fx -= node.x * 0.003;
        fy -= node.y * 0.003;

        // 节点间碰撞排斥力（防止重叠）
        for (const other of this.nodes) {
          if (other.id === node.id) continue;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = (node.radius + other.radius) * 2.5;

          if (dist < minDist) {
            const force = (minDist - dist) / minDist * 3;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        }

        // 关系引力
        for (const edge of this.edges) {
          let other = null;
          if (edge.source === node.id) other = this.nodes.find(n => n.id === edge.target);
          if (edge.target === node.id) other = this.nodes.find(n => n.id === edge.source);
          if (!other) continue;

          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const strength = edge.strength || 1;

          if (edge.type === 'attraction' || edge.type === 'orbit') {
            // 引力，但保持最小距离
            const targetDist = (node.radius + other.radius) * 4;
            if (dist > targetDist) {
              fx += (dx / dist) * 0.003 * strength;
              fy += (dy / dist) * 0.003 * strength;
            }
          } else if (edge.type === 'repulsion') {
            fx -= (dx / dist) * 0.005 * strength;
            fy -= (dy / dist) * 0.005 * strength;
          } else if (edge.type === 'collision') {
            // 碰撞关系：随机微扰
            fx += (Math.random() - 0.5) * 0.5;
            fy += (Math.random() - 0.5) * 0.5;
          }
        }

        node.x += fx;
        node.y += fy;
      }
    }

    // 最终碰撞检测：推开仍然重叠的节点
    for (let pass = 0; pass < 20; pass++) {
      let moved = false;
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i], b = this.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = (a.radius + b.radius) * 2.2;
          if (dist < minDist) {
            const push = (minDist - dist) / 2;
            a.x += (dx / dist) * push;
            a.y += (dy / dist) * push;
            b.x -= (dx / dist) * push;
            b.y -= (dy / dist) * push;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  fitToView() {
    if (this.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of this.nodes) {
      minX = Math.min(minX, node.x - node.radius - 60);
      maxX = Math.max(maxX, node.x + node.radius + 60);
      minY = Math.min(minY, node.y - node.radius - 60);
      maxY = Math.max(maxY, node.y + node.radius + 60);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const scaleX = this.canvas.width / window.devicePixelRatio / contentWidth;
    const scaleY = this.canvas.height / window.devicePixelRatio / contentHeight;
    this.scale = Math.min(scaleX, scaleY, 2);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.offset.x = this.canvas.width / window.devicePixelRatio / 2 - cx * this.scale;
    this.offset.y = this.canvas.height / window.devicePixelRatio / 2 - cy * this.scale;
  }

  // ========== 动画 ==========
  startAnimation() {
    const animate = () => {
      this.time += 0.016;
      this.draw();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  // ========== 主绘制 ==========
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, w, h);

    this.drawNebula(ctx, w, h);
    this.drawStars(ctx, w, h);

    ctx.save();
    ctx.translate(this.offset.x, this.offset.y);
    ctx.scale(this.scale, this.scale);

    this.drawCommunityBackgrounds(ctx);

    for (const edge of this.edges) {
      const source = this.nodes.find(n => n.id === edge.source);
      const target = this.nodes.find(n => n.id === edge.target);
      if (!source || !target) continue;
      this.drawEdge(ctx, source, target, edge);
    }

    // 先画行星环（在主体下面），再画主体
    for (const node of this.nodes) {
      if (node.celestial_type === 'planet') this.drawRingBehind(ctx, node);
    }

    for (const node of this.nodes) {
      this.drawNode(ctx, node);
    }

    ctx.restore();

    this.drawLegend(ctx, w, h);
  }

  drawNebula(ctx, w, h) {
    const g1 = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
    g1.addColorStop(0, 'rgba(88, 28, 135, 0.1)');
    g1.addColorStop(0.5, 'rgba(59, 130, 246, 0.04)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, w * 0.4);
    g2.addColorStop(0, 'rgba(147, 51, 234, 0.08)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  drawStars(ctx, w, h) {
    for (let i = 0; i < 150; i++) {
      const x = (Math.sin(i * 127.1 + 0.5) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 311.7 + 0.3) * 0.5 + 0.5) * h;
      const twinkle = Math.sin(this.time * 1.5 + i) * 0.3 + 0.7;
      const size = (0.5 + Math.sin(i * 73.1) * 0.5) * 1.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + twinkle * 0.25})`;
      ctx.fill();
    }
  }

  drawCommunityBackgrounds(ctx) {
    const groups = {};
    for (const node of this.nodes) {
      const type = node.celestial_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(node);
    }

    const colors = {
      star: 'rgba(251, 191, 36, 0.05)',
      planet: 'rgba(96, 165, 250, 0.05)',
      comet: 'rgba(167, 139, 250, 0.05)',
      meteor: 'rgba(248, 113, 113, 0.05)',
      black_hole: 'rgba(107, 114, 128, 0.08)'
    };

    for (const [type, nodes] of Object.entries(groups)) {
      if (nodes.length < 2) continue;
      let cx = 0, cy = 0;
      for (const n of nodes) { cx += n.x; cy += n.y; }
      cx /= nodes.length;
      cy /= nodes.length;

      let maxDist = 0;
      for (const n of nodes) {
        maxDist = Math.max(maxDist, Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2));
      }

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist + 100);
      grad.addColorStop(0, colors[type] || 'rgba(255,255,255,0.02)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxDist + 100, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEdge(ctx, source, target, edge) {
    const isHighlight = this.selectedNode &&
      (edge.source === this.selectedNode.id || edge.target === this.selectedNode.id);
    const isHover = this.hoveredNode &&
      (edge.source === this.hoveredNode.id || edge.target === this.hoveredNode.id);
    const visible = isHighlight || isHover;

    const alpha = visible ? 0.85 : 0.15;
    const lineWidth = visible ? 2 : 0.8;

    if (visible) {
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `${edge.color}20`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);

    const r = parseInt(edge.color.slice(1, 3), 16);
    const g = parseInt(edge.color.slice(3, 5), 16);
    const b = parseInt(edge.color.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.lineWidth = lineWidth;

    if (edge.type === 'repulsion' || edge.type === 'collision') {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (visible && edge.description) {
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2;
      ctx.font = '10px Inter, sans-serif';
      const tw = ctx.measureText(edge.description).width;
      ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
      ctx.beginPath();
      ctx.roundRect(mx - tw / 2 - 6, my - 10, tw + 12, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#e5e7eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.description, mx, my);
    }
  }

  // ========== 行星环（在主体后面绘制） ==========
  drawRingBehind(ctx, node) {
    const floatX = Math.sin(this.time * 0.8 + node.pulsePhase) * 2;
    const floatY = Math.cos(this.time * 0.6 + node.pulsePhase * 1.3) * 1.5;
    const drawX = node.x + floatX;
    const drawY = node.y + floatY;
    const r = node.radius;

    // 如果有轨道中心恒星，环的朝向跟随轨道角
    let orbitAngle = node.tilt;
    if (node._orbitCenter) {
      orbitAngle = Math.atan2(drawY - node._orbitCenter.y, drawX - node._orbitCenter.x) + Math.PI / 2;
    }

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(orbitAngle);

    // 外环（半透明）
    ctx.strokeStyle = `${node.color}25`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.8, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 内环
    ctx.strokeStyle = `${node.color}18`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.5, r * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // ========== 程序化纹理 ==========
  createStarTexture(ctx, x, y, r, color, node) {
    // 太阳表面：旋转的等离子体纹理
    const key = `star_${color}`;
    const t = this.time * 0.15 + node.pulsePhase;

    // 核心高光
    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, '#fff8e7');
    core.addColorStop(0.3, color);
    core.addColorStop(0.8, this.darken(color, 40));
    core.addColorStop(1, this.darken(color, 80));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 表面湍流纹理（模拟太阳黑子和耀斑）
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      const angle = t * (0.8 + i * 0.2) + i * 1.05;
      const dist = r * (0.2 + Math.sin(i * 2.3 + t) * 0.3);
      const spotX = x + Math.cos(angle) * dist;
      const spotY = y + Math.sin(angle) * dist;
      const spotR = r * (0.15 + Math.sin(i * 1.7 + t * 0.5) * 0.1);
      const spot = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotR);
      spot.addColorStop(0, 'rgba(180, 80, 0, 0.4)');
      spot.addColorStop(1, 'transparent');
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 耀斑光线
    for (let i = 0; i < 4; i++) {
      const angle = t * 0.5 + i * Math.PI / 2;
      const len = r * (0.6 + Math.sin(t * 2 + i) * 0.3);
      ctx.strokeStyle = `rgba(255, 200, 50, ${0.15 + Math.sin(t * 3 + i) * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r * 0.7, y + Math.sin(angle) * r * 0.7);
      ctx.lineTo(x + Math.cos(angle) * (r + len), y + Math.sin(angle) * (r + len));
      ctx.stroke();
    }
    ctx.restore();
  }

  createPlanetTexture(ctx, x, y, r, color, node) {
    // 行星表面：大气带 + 大陆纹理
    const base = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    base.addColorStop(0, this.lighten(color, 35));
    base.addColorStop(0.6, color);
    base.addColorStop(1, this.darken(color, 50));
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 大气带纹理
    ctx.save();
    ctx.clip();
    const t = this.time * 0.1 + node.pulsePhase;
    for (let i = -3; i <= 3; i++) {
      const bandY = y + i * r * 0.25;
      const bandH = r * 0.12;
      const alpha = 0.12 + Math.sin(i * 1.5 + t) * 0.05;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, bandY, r * 1.1, bandH, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 大气旋涡
    for (let i = 0; i < 2; i++) {
      const vx = x + Math.cos(t * 0.5 + i * 3) * r * 0.4;
      const vy = y + Math.sin(t * 0.7 + i * 2) * r * 0.3;
      const vr = r * 0.2;
      const storm = ctx.createRadialGradient(vx, vy, 0, vx, vy, vr);
      storm.addColorStop(0, `rgba(255,255,255,0.2)`);
      storm.addColorStop(0.5, `rgba(255,255,255,0.05)`);
      storm.addColorStop(1, 'transparent');
      ctx.fillStyle = storm;
      ctx.beginPath();
      ctx.arc(vx, vy, vr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  createCometTexture(ctx, x, y, r, color, node) {
    // 彗星：冰核 + 气体包层
    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, '#e0e8ff');
    core.addColorStop(0.4, color);
    core.addColorStop(1, this.darken(color, 60));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 冰晶闪烁
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      const sx = x + Math.cos(i * 1.26 + this.time * 0.3) * r * 0.5;
      const sy = y + Math.sin(i * 1.26 + this.time * 0.3) * r * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(this.time * 4 + i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  createBlackHoleTexture(ctx, x, y, r, node) {
    const t = this.time;

    // 吸积盘（填充的发光盘面，不是线条环）
    ctx.save();
    ctx.translate(x, y);

    // 外层光晕（整体发光）
    const outerGlow = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.2);
    outerGlow.addColorStop(0, 'rgba(255, 200, 100, 0.02)');
    outerGlow.addColorStop(0.5, 'rgba(255, 120, 50, 0.04)');
    outerGlow.addColorStop(0.8, 'rgba(200, 80, 40, 0.02)');
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.2, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 吸积盘主体（填充渐变：内热外冷）
    const diskGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.8);
    diskGrad.addColorStop(0, 'rgba(255, 255, 220, 0.0)');  // 内侧空洞（事件视界区域）
    diskGrad.addColorStop(0.25, `rgba(255, 220, 150, ${0.25 + Math.sin(t * 2.5) * 0.08})`);  // 内侧热白
    diskGrad.addColorStop(0.5, `rgba(255, 140, 60, ${0.18 + Math.sin(t * 1.8 + 1) * 0.06})`);  // 中间橙色
    diskGrad.addColorStop(0.75, `rgba(200, 80, 40, ${0.1 + Math.sin(t * 1.2 + 2) * 0.04})`);  // 外侧暗红
    diskGrad.addColorStop(1, 'rgba(120, 40, 30, 0.0)');  // 最外侧消散
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.8, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 湍流明暗带（模拟盘面不均匀）
    for (let i = 0; i < 5; i++) {
      const angle = t * 0.3 + i * 1.26;
      const innerR = r * 0.5;
      const outerR = r * 1.5;
      const spread = 0.3;
      const bright = 0.5 + Math.sin(t * 3 + i * 2) * 0.3;

      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(innerR, 0, (outerR - innerR) * 0.6, r * spread * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 120, ${0.04 * bright})`;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // 事件视界（纯黑核心，略带紫色边缘）
    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, '#000000');
    core.addColorStop(0.8, '#010101');
    core.addColorStop(0.95, 'rgba(20, 5, 40, 0.7)');
    core.addColorStop(1, 'transparent');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 光子球（事件视界边缘的光亮环）
    const photon = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.2);
    photon.addColorStop(0, 'transparent');
    photon.addColorStop(0.5, `rgba(255, 220, 160, ${0.15 + Math.sin(t * 2) * 0.05})`);
    photon.addColorStop(0.7, `rgba(200, 150, 255, ${0.08 + Math.sin(t * 1.5) * 0.03})`);
    photon.addColorStop(1, 'transparent');
    ctx.fillStyle = photon;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  createMeteorTexture(ctx, x, y, r, color, node) {
    // 流星：岩石表面 + 熔融边缘
    const base = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    base.addColorStop(0, this.lighten(color, 30));
    base.addColorStop(0.5, color);
    base.addColorStop(1, '#4a2020');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 岩石纹理
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 4; i++) {
      const cx = x + Math.cos(i * 1.8) * r * 0.4;
      const cy = y + Math.sin(i * 1.8) * r * 0.4;
      ctx.fillStyle = `rgba(0,0,0,${0.15 + i * 0.03})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ========== 绘制节点主体 ==========
  drawNode(ctx, node) {
    const isSelected = this.selectedNode?.id === node.id;
    const isHovered = this.hoveredNode?.id === node.id;
    const isRelated = this.selectedNode && this.edges.some(
      e => (e.source === this.selectedNode.id && e.target === node.id) ||
           (e.target === this.selectedNode.id && e.source === node.id)
    );

    const floatX = Math.sin(this.time * 0.8 + node.pulsePhase) * 2;
    const floatY = Math.cos(this.time * 0.6 + node.pulsePhase * 1.3) * 1.5;
    const drawX = node.x + floatX;
    const drawY = node.y + floatY;

    const pulse = Math.sin(this.time * 1.5 + node.pulsePhase) * 0.1 + 1;
    const r = node.radius * (isSelected ? 1.2 : isHovered ? 1.1 : 1);

    // 彗星拖尾
    if (node.celestial_type === 'comet') {
      const tailLen = 50;
      const tailAngle = Math.atan2(floatY, floatX) + Math.PI;
      const grad = ctx.createLinearGradient(
        drawX, drawY,
        drawX + Math.cos(tailAngle) * tailLen,
        drawY + Math.sin(tailAngle) * tailLen
      );
      grad.addColorStop(0, `${node.color}60`);
      grad.addColorStop(0.5, `${node.color}20`);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY);
      ctx.lineTo(
        drawX + Math.cos(tailAngle) * tailLen,
        drawY + Math.sin(tailAngle) * tailLen
      );
      ctx.stroke();
    }

    // 外发光
    const glowIntensity = {
      star: 0.5, planet: 0.2, comet: 0.3, meteor: 0.15, black_hole: 0.35
    }[node.celestial_type] || 0.2;

    const glow = ctx.createRadialGradient(drawX, drawY, r * 0.5, drawX, drawY, r * 2.5 * pulse);
    glow.addColorStop(0, `${node.color}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}`);
    glow.addColorStop(0.5, `${node.color}10`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(drawX, drawY, r * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 流星闪烁
    let flickerAlpha = 1;
    if (node.celestial_type === 'meteor') {
      flickerAlpha = 0.7 + Math.sin(this.time * 8 + node.pulsePhase) * 0.3;
    }

    ctx.globalAlpha = flickerAlpha;

    // 根据天体类型绘制不同纹理
    ctx.save();
    switch (node.celestial_type) {
      case 'star':
        this.createStarTexture(ctx, drawX, drawY, r, node.color, node);
        break;
      case 'planet':
        this.createPlanetTexture(ctx, drawX, drawY, r, node.color, node);
        break;
      case 'comet':
        this.createCometTexture(ctx, drawX, drawY, r, node.color, node);
        break;
      case 'meteor':
        this.createMeteorTexture(ctx, drawX, drawY, r, node.color, node);
        break;
      case 'black_hole':
        this.createBlackHoleTexture(ctx, drawX, drawY, r, node);
        break;
      default:
        const grad = ctx.createRadialGradient(
          drawX - r * 0.3, drawY - r * 0.3, 0, drawX, drawY, r
        );
        grad.addColorStop(0, this.lighten(node.color, 25));
        grad.addColorStop(1, node.color);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    if (isSelected || isHovered || isRelated) {
      ctx.strokeStyle = isSelected ? '#ffffff' : `${node.color}80`;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // 演化标记
    if (node.has_evolution) {
      const ep = Math.sin(this.time * 2 + node.pulsePhase) * 0.3 + 0.7;
      const mx = drawX + r * 0.7;
      const my = drawY - r * 0.7;
      ctx.globalAlpha = ep;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#080c14';
      ctx.font = 'bold 7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', mx, my);
      ctx.globalAlpha = 1;
    }

    // 标签
    ctx.font = `${isSelected ? 'bold ' : ''}11px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = node.name;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(5, 8, 16, 0.85)';
    ctx.beginPath();
    ctx.roundRect(drawX - tw / 2 - 4, drawY + r + 4, tw + 8, 16, 3);
    ctx.fill();
    ctx.fillStyle = isSelected ? '#ffffff' : '#e5e7eb';
    ctx.fillText(label, drawX, drawY + r + 7);
  }

  drawLegend(ctx, w, h) {
    const items = [
      { label: 'Star 恒星', color: '#fbbf24' },
      { label: 'Planet 行星', color: '#60a5fa' },
      { label: 'Comet 彗星', color: '#a78bfa' },
      { label: 'Meteor 流星', color: '#f87171' },
      { label: 'Black Hole 黑洞', color: '#6b7280' },
      { label: 'E 已演化', color: '#fbbf24', dot: true },
    ];

    const startX = 16, startY = h - 120, lineH = 18;

    ctx.fillStyle = 'rgba(5, 8, 16, 0.8)';
    ctx.beginPath();
    ctx.roundRect(startX - 8, startY - 8, 130, items.length * lineH + 16, 6);
    ctx.fill();

    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    items.forEach((item, i) => {
      const y = startY + i * lineH;
      ctx.fillStyle = item.color;
      if (item.dot) {
        ctx.beginPath();
        ctx.arc(startX + 6, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#080c14';
        ctx.font = 'bold 7px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', startX + 6, y);
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
      } else {
        ctx.beginPath();
        ctx.arc(startX + 6, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(item.label, startX + 16, y);
    });
  }

  // ========== 交互 ==========
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offset.x) / this.scale;
    const y = (e.clientY - rect.top - this.offset.y) / this.scale;

    for (const node of this.nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < (node.radius + 8) * (node.radius + 8)) {
        this.selectedNode = node;
        this.isDraggingNode = true;
        this.dragNode = node;
        this.onNodeSelect(node);
        return;
      }
    }

    this.selectedNode = null;
    this.isDragging = true;
    this.dragStart = { x: e.clientX - this.offset.x, y: e.clientY - this.offset.y };
    this.canvas.style.cursor = 'grabbing';
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();

    if (this.isDraggingNode && this.dragNode) {
      this.dragNode.x = (e.clientX - rect.left - this.offset.x) / this.scale;
      this.dragNode.y = (e.clientY - rect.top - this.offset.y) / this.scale;
      return;
    }

    if (this.isDragging) {
      this.offset.x = e.clientX - this.dragStart.x;
      this.offset.y = e.clientY - this.dragStart.y;
      return;
    }

    const x = (e.clientX - rect.left - this.offset.x) / this.scale;
    const y = (e.clientY - rect.top - this.offset.y) / this.scale;

    this.hoveredNode = null;
    for (const node of this.nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < (node.radius + 8) * (node.radius + 8)) {
        this.hoveredNode = node;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }
    this.canvas.style.cursor = 'grab';
  }

  onMouseUp() {
    this.isDragging = false;
    this.isDraggingNode = false;
    this.dragNode = null;
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, this.scale * delta));
    this.offset.x = mouseX - (mouseX - this.offset.x) * (newScale / this.scale);
    this.offset.y = mouseY - (mouseY - this.offset.y) * (newScale / this.scale);
    this.scale = newScale;
  }

  onNodeSelect(node) {}

  lighten(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + pct);
    const g = Math.min(255, ((n >> 8) & 0xFF) + pct);
    const b = Math.min(255, (n & 0xFF) + pct);
    return `rgb(${r},${g},${b})`;
  }

  darken(hex, pct) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - pct);
    const g = Math.max(0, ((n >> 8) & 0xFF) - pct);
    const b = Math.max(0, (n & 0xFF) - pct);
    return `rgb(${r},${g},${b})`;
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }
}

window.GalaxyEngine = GalaxyEngine;
