// Galaxy Engine v3 - 平衡态星图
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
    this.settled = false;

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
      pulsePhase: Math.random() * Math.PI * 2
    }));
    this.edges = edges;

    // 计算平衡位置
    this.computeEquilibrium();
    this.fitToView();
    this.startAnimation();
  }

  getNodeRadius(type, mass) {
    const base = { star: 22, planet: 16, comet: 11, meteor: 8, black_hole: 25 };
    return (base[type] || 10) + (mass || 1) * 1.5;
  }

  // ========== 计算平衡位置 ==========
  computeEquilibrium() {
    const n = this.nodes.length;
    if (n === 0) return;

    // 简单策略：按环形分布，根据质量调整距离
    const totalMass = this.nodes.reduce((sum, node) => sum + (node.mass || 1), 0);

    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      // 质量越大，离中心越远（更"重"的天体轨道更大）
      const massRatio = (node.mass || 1) / totalMass;
      const radius = 80 + massRatio * 400;

      node.x = Math.cos(angle) * radius;
      node.y = Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
    }

    // 微调：有关系的节点靠近一些
    for (let iter = 0; iter < 50; iter++) {
      for (const node of this.nodes) {
        let fx = 0, fy = 0;

        // 轻微向心力
        fx -= node.x * 0.005;
        fy -= node.y * 0.005;

        // 关系引力
        for (const edge of this.edges) {
          let other = null;
          if (edge.source === node.id) other = this.nodes.find(n => n.id === edge.target);
          if (edge.target === node.id) other = this.nodes.find(n => n.id === edge.source);
          if (!other) continue;

          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const strength = edge.strength || 1;

          if (edge.type === 'attraction' || edge.type === 'orbit') {
            fx += dx * 0.002 * strength;
            fy += dy * 0.002 * strength;
          } else if (edge.type === 'repulsion') {
            fx -= dx * 0.001 * strength;
            fy -= dy * 0.001 * strength;
          }
        }

        node.x += fx;
        node.y += fy;
      }
    }
  }

  fitToView() {
    if (this.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of this.nodes) {
      minX = Math.min(minX, node.x - node.radius - 40);
      maxX = Math.max(maxX, node.x + node.radius + 40);
      minY = Math.min(minY, node.y - node.radius - 40);
      maxY = Math.max(maxY, node.y + node.radius + 40);
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

  // ========== 动画（仅视觉效果，不改变位置） ==========
  startAnimation() {
    const animate = () => {
      this.time += 0.016;
      this.draw();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  // ========== 绘制 ==========
  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080c14';
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

    for (const node of this.nodes) {
      this.drawNode(ctx, node);
    }

    ctx.restore();

    this.drawLegend(ctx, w, h);
  }

  drawNebula(ctx, w, h) {
    const g1 = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
    g1.addColorStop(0, 'rgba(88, 28, 135, 0.08)');
    g1.addColorStop(0.5, 'rgba(59, 130, 246, 0.03)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, w * 0.4);
    g2.addColorStop(0, 'rgba(147, 51, 234, 0.06)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
  }

  drawStars(ctx, w, h) {
    for (let i = 0; i < 120; i++) {
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
      star: 'rgba(251, 191, 36, 0.04)',
      planet: 'rgba(96, 165, 250, 0.04)',
      comet: 'rgba(167, 139, 250, 0.04)',
      meteor: 'rgba(248, 113, 113, 0.04)',
      black_hole: 'rgba(107, 114, 128, 0.06)'
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

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist + 80);
      grad.addColorStop(0, colors[type] || 'rgba(255,255,255,0.02)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxDist + 80, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEdge(ctx, source, target, edge) {
    const isHighlight = this.selectedNode &&
      (edge.source === this.selectedNode.id || edge.target === this.selectedNode.id);
    const isHover = this.hoveredNode &&
      (edge.source === this.hoveredNode.id || edge.target === this.hoveredNode.id);
    const visible = isHighlight || isHover;

    const alpha = visible ? 0.85 : 0.2;
    const lineWidth = visible ? 2 : 1;

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
      ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
      ctx.beginPath();
      ctx.roundRect(mx - tw / 2 - 4, my - 18, tw + 8, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#d1d5db';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.description, mx, my - 10);
    }
  }

  drawNode(ctx, node) {
    const isSelected = this.selectedNode?.id === node.id;
    const isHovered = this.hoveredNode?.id === node.id;
    const isRelated = this.selectedNode && this.edges.some(
      e => (e.source === this.selectedNode.id && e.target === node.id) ||
           (e.target === this.selectedNode.id && e.source === node.id)
    );

    // 微妙的浮动效果
    const floatX = Math.sin(this.time * 0.8 + node.pulsePhase) * 2;
    const floatY = Math.cos(this.time * 0.6 + node.pulsePhase * 1.3) * 1.5;
    const drawX = node.x + floatX;
    const drawY = node.y + floatY;

    const pulse = Math.sin(this.time * 1.5 + node.pulsePhase) * 0.1 + 1;
    const r = node.radius * (isSelected ? 1.2 : isHovered ? 1.1 : 1);

    // 彗星拖尾
    if (node.celestial_type === 'comet') {
      const tailLen = 40;
      const tailAngle = Math.atan2(floatY, floatX) + Math.PI;
      const grad = ctx.createLinearGradient(
        drawX, drawY,
        drawX + Math.cos(tailAngle) * tailLen,
        drawY + Math.sin(tailAngle) * tailLen
      );
      grad.addColorStop(0, `${node.color}60`);
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

    // 外发光（所有类型都有，强度不同）
    const glowIntensity = {
      star: 0.4, planet: 0.2, comet: 0.25, meteor: 0.15, black_hole: 0.3
    }[node.celestial_type] || 0.2;

    const glow = ctx.createRadialGradient(drawX, drawY, r * 0.5, drawX, drawY, r * 2.5 * pulse);
    glow.addColorStop(0, `${node.color}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}`);
    glow.addColorStop(0.5, `${node.color}10`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(drawX, drawY, r * 2.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 黑洞吸积盘
    if (node.celestial_type === 'black_hole') {
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(this.time * 0.3);
      const disk = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 2);
      disk.addColorStop(0, 'rgba(239, 68, 68, 0.12)');
      disk.addColorStop(0.5, 'rgba(251, 146, 60, 0.06)');
      disk.addColorStop(1, 'transparent');
      ctx.fillStyle = disk;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 流星闪烁
    let flickerAlpha = 1;
    if (node.celestial_type === 'meteor') {
      flickerAlpha = 0.7 + Math.sin(this.time * 8 + node.pulsePhase) * 0.3;
    }

    // 主体渐变
    const grad = ctx.createRadialGradient(
      drawX - r * 0.3, drawY - r * 0.3, 0,
      drawX, drawY, r
    );
    if (isSelected) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, node.color);
      grad.addColorStop(1, node.color + 'cc');
    } else {
      grad.addColorStop(0, this.lighten(node.color, 25));
      grad.addColorStop(1, node.color);
    }

    ctx.globalAlpha = flickerAlpha;
    ctx.beginPath();
    ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    if (isSelected || isHovered || isRelated) {
      ctx.strokeStyle = isSelected ? '#ffffff' : `${node.color}80`;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 行星环
    if (node.celestial_type === 'planet') {
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(this.time * 0.2 + node.pulsePhase);
      ctx.strokeStyle = `${node.color}30`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.6, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 标签
    ctx.font = `${isSelected ? 'bold ' : ''}11px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = node.name;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
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
    ];

    const startX = 16, startY = h - 110, lineH = 18;

    ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
    ctx.beginPath();
    ctx.roundRect(startX - 8, startY - 8, 130, items.length * lineH + 16, 6);
    ctx.fill();

    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    items.forEach((item, i) => {
      const y = startY + i * lineH;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(startX + 6, y, 4, 0, Math.PI * 2);
      ctx.fill();
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

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }
}

window.GalaxyEngine = GalaxyEngine;
