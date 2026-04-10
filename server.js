const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_CONFIG = { cookieString: '' };

function loadConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    // Migrate old format (individual fields) to new format (cookieString)
    if (!cfg.cookieString && cfg.serviceToken) {
      const parts = [];
      if (cfg.serviceToken) parts.push(`serviceToken="${cfg.serviceToken}"`);
      if (cfg.xiaomichatbot_ph) parts.push(`xiaomichatbot_ph="${cfg.xiaomichatbot_ph}"`);
      if (cfg.apiPlatformServiceToken) parts.push(`api-platform_serviceToken="${cfg.apiPlatformServiceToken}"`);
      if (cfg.userId) parts.push(`userId=${cfg.userId}`);
      if (cfg.apiPlatformSlh) parts.push(`api-platform_slh="${cfg.apiPlatformSlh}"`);
      if (cfg.apiPlatformPh) parts.push(`api-platform_ph="${cfg.apiPlatformPh}"`);
      cfg.cookieString = parts.join('; ');
    }
    return cfg;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

// Parse a raw cookie string like 'a=1; b=2' into { a: '1', b: '2' }
function parseCookieString(str) {
  const cookies = {};
  if (!str) return cookies;
  for (const part of str.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) cookies[key] = val;
  }
  return cookies;
}

// Build cookie header from a raw cookie string, preserving original format
function buildCookie(cfg) {
  return cfg.cookieString || '';
}

function maskValue(val) {
  if (!val) return '';
  if (val.length <= 8) return val;
  return val.slice(0, 4) + '****' + val.slice(-4);
}

// GET /api/usage - proxy to MiMo platform
app.get('/api/usage', async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!cfg.cookieString) {
      return res.status(400).json({ error: '配置不完整，请先在设置中粘贴 cookie 信息' });
    }
    const cookies = parseCookieString(cfg.cookieString);
    if (!cookies.serviceToken || !cookies.userId) {
      return res.status(400).json({ error: 'Cookie 中缺少必要字段 (serviceToken, userId)' });
    }

    const resp = await fetch('https://platform.xiaomimimo.com/api/v1/tokenPlan/usage', {
      headers: {
        'accept': '*/*',
        'accept-language': 'zh',
        'content-type': 'application/json',
        'cookie': buildCookie(cfg),
        'referer': 'https://platform.xiaomimimo.com/',
        'x-timezone': 'Asia/Hong_Kong',
      }
    });

    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/config - return config with masked tokens
app.get('/api/config', (req, res) => {
  try {
    const cfg = loadConfig();
    res.json({
      config: {
        cookieString: maskValue(cfg.cookieString || ''),
      },
      hasValues: !!(cfg.cookieString && cfg.cookieString.trim()),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/config - update config (requires admin key)
app.put('/api/config', (req, res) => {
  try {
    if (ADMIN_KEY && req.body.adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: '密钥错误' });
    }
    const cfg = loadConfig();
    if (req.body.cookieString !== undefined) {
      cfg.cookieString = req.body.cookieString;
    }
    saveConfig(cfg);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`MiMo Usage server running at http://localhost:${PORT}`);
});
