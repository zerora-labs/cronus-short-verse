# CronusShortVerse 部署指南

## 快速部署（推荐 MVP 阶段）

### 方式一：直接部署

```bash
# 1. 服务器上安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. 克隆代码
git clone <your-repo-url> /opt/cronus-short-verse
cd /opt/cronus-short-verse

# 3. 安装依赖
cd packages/server && npm install --production

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET 和 CORS_ORIGIN
vi .env

# 5. 导入种子数据（可选）
node seed.js

# 6. 启动
NODE_ENV=production node src/index.js
# 或使用 pm2 保持运行：
npm install -g pm2
pm2 start src/index.js --name cronus -e ../logs/err.log -o ../logs/out.log
pm2 save
```

### 方式二：Docker 部署

```bash
# 构建镜像
docker build -t cronus-short-verse .

# 运行
docker run -d \
  --name cronus \
  -p 3001:3001 \
  -v cronus-data:/app/packages/server/data \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=https://your-domain.com \
  cronus-short-verse
```

## 必须配置的环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3001` |
| `NODE_ENV` | 运行环境 | `development` |
| `JWT_SECRET` | JWT 签名密钥 | ⚠️ 必须修改 |
| `CORS_ORIGIN` | 允许的前端域名 | `*`（开发用） |

## 反向代理（Nginx）

如果需要域名 + HTTPS：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

HTTPS 推荐使用 certbot 自动申请 Let's Encrypt 证书。

## 数据库备份

SQLite 数据文件位于 `packages/server/data/cronus.db`：

```bash
# 手动备份
cp packages/server/data/cronus.db backups/cronus-$(date +%Y%m%d).db

# 定时备份（crontab）
0 3 * * * cp /opt/cronus-short-verse/packages/server/data/cronus.db /opt/backups/cronus-$(date +\%Y\%m\%d).db
```

## 推荐云服务器配置

| 阶段 | 配置 | 预估费用 |
|------|------|----------|
| MVP / 测试 | 1C1G 轻量应用服务器 | ¥30-50/月 |
| 正式上线 | 2C4G 云服务器 | ¥100-200/月 |

国内推荐：阿里云轻量应用服务器、腾讯云轻量
海外推荐：DigitalOcean $6/mo droplet、Hetzner
