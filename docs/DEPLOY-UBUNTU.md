# HotBoard Ubuntu 部署指南

在 Ubuntu 服务器上部署 HotBoard 热榜聚合平台的完整步骤。

---

## 📋 系统要求

- **操作系统**: Ubuntu 22.04 LTS 或更高版本
- **内存**: 至少 2GB RAM（推荐 4GB）
- **磁盘**: 至少 20GB 可用空间
- **网络**: 可访问互联网（用于抓取数据）

---

## 🚀 快速部署（Docker 方式，推荐）

### 1. 安装 Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
sudo apt install -y docker.io docker-compose

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker-compose --version
```

### 2. 克隆项目

```bash
# 创建项目目录
mkdir -p /opt/hotboard
cd /opt/hotboard

# 复制项目文件（从开发机复制或使用 git）
# 方式1：使用 scp 从 Windows 复制
# scp -r user@windows-ip:/path/to/hotboard-project/* .

# 方式2：使用 git（如果项目已提交到 git）
# git clone https://your-git-repo.git .
```

### 3. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# 数据库
POSTGRES_PASSWORD=hotboard123
DATABASE_URL=postgresql://hotboard:hotboard123@postgres:5432/hotboard

# JWT
JWT_SECRET=your-secret-key-change-this-in-production

# 管理员
ADMIN_EMAIL=admin@hotboard.com
ADMIN_PASSWORD=admin123456

# Worker
WORKER_PORT=3001
HOTBOARD_URL=http://app:3000

# 时区
TZ=Asia/Shanghai
EOF
```

### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 5. 初始化数据库

```bash
# 等待 PostgreSQL 启动完成（约 10 秒）
sleep 10

# 执行初始化脚本
docker-compose exec -T postgres psql -U hotboard -d hotboard < sql/init-database.sql

# 添加 display_order 字段（如果还没添加）
docker-compose exec -T postgres psql -U hotboard -d hotboard < sql/add-display-order.sql
```

### 6. 验证部署

```bash
# 检查应用是否运行
curl http://localhost:3000/api/nodes?limit=1

# 检查 Worker 是否运行
curl http://localhost:3001/status

# 查看所有服务日志
docker-compose logs -f
```

---

## 🔧 手动部署（非 Docker）

### 1. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20
sudo apt install -y curl
sudo curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证 Node.js
node --version  # 应显示 v20.x.x
npm --version

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动 PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. 配置 PostgreSQL

```bash
# 切换到 postgres 用户
sudo -u postgres psql << 'EOF'
-- 创建数据库和用户
CREATE USER hotboard WITH PASSWORD 'hotboard123';
CREATE DATABASE hotboard OWNER hotboard;
GRANT ALL PRIVILEGES ON DATABASE hotboard TO hotboard;

-- 退出
\q
EOF

# 允许本地连接
sudo sed -i 's/peer/trust/g' /etc/postgresql/*/main/pg_hba.conf
sudo sed -i 's/scram-sha-256/trust/g' /etc/postgresql/*/main/pg_hba.conf
sudo systemctl restart postgresql
```

### 3. 部署应用

```bash
# 创建应用目录
sudo mkdir -p /opt/hotboard
sudo chown $USER:$USER /opt/hotboard
cd /opt/hotboard

# 复制项目文件
# （从开发机复制或使用 git）

# 安装依赖
npm install

# 初始化数据库
export PGPASSWORD=hotboard123
psql -U hotboard -d hotboard -h localhost -f sql/init-database.sql
psql -U hotboard -d hotboard -h localhost -f sql/add-display-order.sql

# 创建环境变量文件
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://hotboard:hotboard123@localhost:5432/hotboard
JWT_SECRET=your-secret-key-change-this-in-production
ADMIN_EMAIL=admin@hotboard.com
ADMIN_PASSWORD=admin123456
WORKER_PORT=3001
HOTBOARD_URL=http://localhost:3000
EOF

# 构建应用
npm run build
```

### 4. 配置 Systemd 服务

#### 创建应用服务

```bash
sudo tee /etc/systemd/system/hotboard-app.service << 'EOF'
[Unit]
Description=HotBoard Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/hotboard
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
```

#### 创建 Worker 服务

```bash
sudo tee /etc/systemd/system/hotboard-worker.service << 'EOF'
[Unit]
Description=HotBoard Worker
After=network.target hotboard-app.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/hotboard
ExecStart=/usr/bin/node scripts/worker.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=HOTBOARD_URL=http://localhost:3000
Environment=WORKER_PORT=3001
Environment=TZ=Asia/Shanghai

[Install]
WantedBy=multi-user.target
EOF
```

#### 启动服务

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动应用
sudo systemctl start hotboard-app
sudo systemctl enable hotboard-app

# 启动 Worker
sudo systemctl start hotboard-worker
sudo systemctl enable hotboard-worker

# 查看状态
sudo systemctl status hotboard-app
sudo systemctl status hotboard-worker
```

---

## 🔒 安全配置

### 1. 配置防火墙

```bash
# 安装 ufw
sudo apt install -y ufw

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许应用端口（如果使用非标准端口）
sudo ufw allow 3000/tcp

# 启用防火墙
sudo ufw enable
```

### 2. 配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建配置文件
sudo tee /etc/nginx/sites-available/hotboard << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Worker API（可选，内部使用）
    location /worker/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/hotboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 3. 配置 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo systemctl enable certbot.timer
```

---

## 📊 监控与维护

### 查看日志

```bash
# Docker 方式
docker-compose logs -f app
docker-compose logs -f worker
docker-compose logs -f postgres

# Systemd 方式
sudo journalctl -u hotboard-app -f
sudo journalctl -u hotboard-worker -f
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 备份数据库

```bash
# 创建备份脚本
sudo tee /opt/hotboard/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hotboard/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Docker 方式
# docker-compose exec -T postgres pg_dump -U hotboard hotboard > $BACKUP_DIR/hotboard_$DATE.sql

# 本地 PostgreSQL 方式
export PGPASSWORD=hotboard123
pg_dump -U hotboard -h localhost hotboard > $BACKUP_DIR/hotboard_$DATE.sql

# 保留最近 7 天的备份
find $BACKUP_DIR -name "hotboard_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/hotboard_$DATE.sql"
EOF

sudo chmod +x /opt/hotboard/backup.sh

# 添加定时任务（每天凌晨 3 点备份）
echo "0 3 * * * /opt/hotboard/backup.sh" | sudo crontab -
```

### 更新应用

```bash
cd /opt/hotboard

# Docker 方式
docker-compose down
git pull  # 或复制新文件
docker-compose up -d --build

# Systemd 方式
git pull  # 或复制新文件
npm install
npm run build
sudo systemctl restart hotboard-app hotboard-worker
```

---

## 🐛 常见问题

### Q1: Worker 无法连接到数据库？

A: 检查数据库连接字符串和防火墙设置：
```bash
# 测试数据库连接
docker-compose exec app nc -zv postgres 5432

# 或本地测试
psql -U hotboard -h localhost -d hotboard -c "SELECT 1"
```

### Q2: 抓取任务不执行？

A: 检查 Worker 状态和定时配置：
```bash
# 查看 Worker 状态
curl http://localhost:3001/status

# 查看定时配置
cat .schedule-config.json

# 重启 Worker
sudo systemctl restart hotboard-worker
# 或
docker-compose restart worker
```

### Q3: 时区显示不正确？

A: 确保系统时区和容器时区一致：
```bash
# 设置系统时区
sudo timedatectl set-timezone Asia/Shanghai

# Docker 方式已在 docker-compose.yml 中设置 TZ=Asia/Shanghai
```

### Q4: 内存不足？

A: 添加 Swap 空间：
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Q5: 如何查看抓取日志？

A: 
```bash
# Docker
docker-compose logs -f worker | grep "抓取"

# Systemd
sudo journalctl -u hotboard-worker -f | grep "抓取"
```

---

## 📞 部署检查清单

- [ ] Docker 或 Node.js 已安装
- [ ] PostgreSQL 已安装并运行
- [ ] 数据库已初始化
- [ ] 环境变量已配置
- [ ] 应用服务已启动
- [ ] Worker 服务已启动
- [ ] Nginx 已配置（生产环境）
- [ ] HTTPS 已配置（生产环境）
- [ ] 防火墙已配置
- [ ] 定时备份已配置
- [ ] 监控已配置（可选）

---

## 🔗 相关文档

- [README.md](./README.md) - 项目概述
- [docs/WORKER.md](./docs/WORKER.md) - Worker 详细文档
- [docs/CRON-CONFIG.md](./docs/CRON-CONFIG.md) - 定时配置说明

---

**最后更新**: 2026-04-02 10:33 GMT+8
