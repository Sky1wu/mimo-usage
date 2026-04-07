# MiMo Token Usage

查看 MiMo 平台本月 Token 用量的 Web 面板。

## 快速开始

```bash
npm install
cp config.example.json config.json
# 编辑 config.json 填入 cookie 信息
npm start
```

浏览器打开 `http://localhost:3000`。

## 配置

编辑 `config.json`：

| 字段 | 必填 | 说明 |
|------|------|------|
| `serviceToken` | 是 | Cookie 中的 serviceToken |
| `apiPlatformServiceToken` | 是 | Cookie 中的 api-platform_serviceToken |
| `userId` | 是 | Cookie 中的 userId |
| `xiaomichatbot_ph` | 否 | Cookie 中的 xiaomichatbot_ph |
| `apiPlatformSlh` | 否 | Cookie 中的 api-platform_slh |
| `apiPlatformPh` | 否 | Cookie 中的 api-platform_ph |

Cookie 值可通过浏览器开发者工具 > Network 面板，访问 `platform.xiaomimimo.com` 后从请求头中获取。

## 部署

### systemd 服务

创建服务文件：

```bash
sudo tee /etc/systemd/system/mimo-usage.service << 'EOF'
[Unit]
Description=MiMo Token Usage Panel
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mimo-usage
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF
```

部署并启动：

```bash
sudo cp -r . /opt/mimo-usage
cd /opt/mimo-usage && npm install --production
sudo systemctl daemon-reload
sudo systemctl enable --now mimo-usage
```

查看状态：

```bash
sudo systemctl status mimo-usage
journalctl -u mimo-usage -f
```

### Nginx 反向代理

```bash
sudo tee /etc/nginx/sites-available/mimo-usage << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/mimo-usage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
