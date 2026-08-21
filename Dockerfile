FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY packages/server/package.json ./packages/server/
RUN cd packages/server && npm install --production

# 复制源码
COPY packages/server/src ./packages/server/src
COPY packages/server/data ./packages/server/data
COPY packages/web ./packages/web

# 环境变量
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "packages/server/src/index.js"]
