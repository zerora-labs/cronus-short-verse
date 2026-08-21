#!/bin/bash
set -e

echo "🌌 CronusShortVerse 一键部署脚本"
echo "================================"

# ========== 配置区（按需修改） ==========
REPO_URL="git@github.com:zerora-labs/cronus-short-verse.git"
INSTALL_DIR="/opt/cronus-short-verse"
JWT_SECRET=$(openssl rand -hex 32)
PORT=3001
# ==========================================

echo ""
echo "📦 1/6 安装系统依赖..."
apt update && apt upgrade -y
apt install -y build-essential git curl

echo ""
echo "📦 2/6 安装 Node.js 20..."
if command -v node &> /dev/null; then
  echo "  Node.js 已安装: $(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  echo "  Node.js 已安装: $(node -v)"
fi

echo ""
echo "📦 3/6 安装 PM2..."
if command -v pm2 &> /dev/null; then
  echo "  PM2 已安装"
else
  npm install -g pm2
  echo "  PM2 已安装"
fi

echo ""
echo "📥 4/6 克隆代码..."
if [ -d "$INSTALL_DIR" ]; then
  echo "  目录已存在，拉取最新代码..."
  cd "$INSTALL_DIR" && git pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo ""
echo "📦 5/6 安装项目依赖..."
cd "$INSTALL_DIR/packages/server"
npm install --production

echo ""
echo "⚙️  6/6 配置环境..."
cat > "$INSTALL_DIR/packages/server/.env" << EOF
PORT=$PORT
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=*
EOF

# 创建数据目录
mkdir -p "$INSTALL_DIR/packages/server/data"

# 导入种子数据（如果数据库为空）
DB_FILE="$INSTALL_DIR/packages/server/data/cronus.db"
if [ ! -f "$DB_FILE" ]; then
  echo "  导入种子数据..."
  node "$INSTALL_DIR/packages/server/seed.js"
fi

# 启动服务
echo ""
echo "🚀 启动服务..."
cd "$INSTALL_DIR/packages/server"
pm2 delete cronus 2>/dev/null || true
pm2 start src/index.js --name cronus \
  --max-memory-restart 256M \
  -e /var/log/cronus-error.log \
  -o /var/log/cronus-out.log
pm2 save

# 设置开机自启
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "================================"
echo "✅ 部署完成！"
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP'):$PORT"
echo "  JWT密钥: $JWT_SECRET"
echo "  日志目录: /var/log/cronus-*.log"
echo ""
echo "  常用命令："
echo "    pm2 status          # 查看状态"
echo "    pm2 logs cronus      # 查看日志"
echo "    pm2 restart cronus   # 重启服务"
echo ""
echo "  测试账号（种子数据）："
echo "    邮箱: dreamer@test.com"
echo "    密码: 任意（种子数据未设真实密码，需注册新账号）"
echo ""
