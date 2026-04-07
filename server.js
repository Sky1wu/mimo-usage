const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

function buildCookie(cfg) {
  const parts = [];
  if (cfg.serviceToken) parts.push(`serviceToken="${cfg.serviceToken}"`);
  if (cfg.xiaomichatbot_ph) parts.push(`xiaomichatbot_ph="${cfg.xiaomichatbot_ph}"`);
  if (cfg.apiPlatformServiceToken) parts.push(`api-platform_serviceToken="${cfg.apiPlatformServiceToken}"`);
  if (cfg.userId) parts.push(`userId=${cfg.userId}`);
  if (cfg.apiPlatformSlh) parts.push(`api-platform_slh="${cfg.apiPlatformSlh}"`);
  if (cfg.apiPlatformPh) parts.push(`api-platform_ph="${cfg.apiPlatformPh}"`);
  return parts.join('; ');
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
    if (!cfg.serviceToken || !cfg.apiPlatformServiceToken || !cfg.userId) {
      return res.status(400).json({ error: '配置不完整，请先在设置中填写 cookie 信息' });
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
    const masked = {};
    for (const [k, v] of Object.entries(cfg)) {
      masked[k] = maskValue(v);
    }
    res.json({ config: masked, hasValues: Object.values(cfg).some(v => v) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/config - update config
app.put('/api/config', (req, res) => {
  try {
    const cfg = loadConfig();
    const fields = ['serviceToken', 'xiaomichatbot_ph', 'apiPlatformServiceToken', 'userId', 'apiPlatformSlh', 'apiPlatformPh'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        cfg[f] = req.body[f];
      }
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
