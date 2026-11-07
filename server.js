const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const config = require('./config');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 24 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

// Rate limit simples em memória para proteger a rota de orçamento
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQ = 15;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX_REQ;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function clean(value, maxLength = 300) {
  return String(value ?? '')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk, 'utf8');
      if (bytes > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('A mensagem enviada excede o limite permitido.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(Object.assign(new Error('Formato de dados inválido.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  // Cabeçalhos de Segurança (Hardening)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  // Endpoint de Configuração Pública
  if (req.method === 'GET' && pathname === '/api/config') {
    const isWaValid = /^\d{10,15}$/.test(config.whatsappNumber);
    const defaultGreeting = encodeURIComponent(
      `Olá! Vim pelo site da ${config.businessName} e gostaria de solicitar um atendimento.`
    );
    return sendJson(res, 200, {
      businessName: config.businessName,
      tagline: config.tagline,
      city: config.city,
      address: config.address,
      openingHours: config.openingHours,
      phoneDisplay: config.phoneDisplay,
      instagramUrl: config.instagramUrl,
      instagramHandle: config.instagramHandle,
      whatsappConfigured: isWaValid,
      whatsappUrl: isWaValid ? `https://wa.me/${config.whatsappNumber}?text=${defaultGreeting}` : ''
    });
  }

  // Endpoint de Geração de Orçamento para WhatsApp
  if (req.method === 'POST' && pathname === '/api/orcamento') {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return sendJson(res, 429, { error: 'Muitas solicitações seguidas. Aguarde um instante e tente novamente.' });
    }

    try {
      const body = await readJson(req);
      const name = clean(body.name, 80);
      const phone = clean(body.phone, 30);
      const brand = clean(body.brand, 50);
      const model = clean(body.model, 80);
      const service = clean(body.service, 100);
      const details = clean(body.details, 500);

      if (!name || !phone || !service) {
        return sendJson(res, 400, { error: 'Por favor, preencha seu nome, WhatsApp e o tipo de serviço.' });
      }
      if (!/^\d{10,15}$/.test(config.whatsappNumber)) {
        return sendJson(res, 503, { error: 'O WhatsApp ainda não foi configurado. Entre em contato pelo Instagram.' });
      }

      const deviceLine = [brand, model].filter(Boolean).join(' • ');
      const message = [
        `Olá, equipe *${config.businessName}*! Vim pelo site e gostaria de um orçamento:`,
        '',
        `👤 *Cliente:* ${name}`,
        `📞 *Contato:* ${phone}`,
        deviceLine ? `📱 *Aparelho:* ${deviceLine}` : '',
        `🛠️ *Serviço:* ${service}`,
        details ? `📝 *Detalhes:* ${details}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      return sendJson(res, 200, {
        whatsappUrl: `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, {
        error: error.message || 'Não foi possível processar o formulário.'
      });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST', 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Método não permitido.');
  }

  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== path.join(PUBLIC_DIR, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acesso negado.');
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Página não encontrada.');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Erro interno do servidor.');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    };

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const isCompressible = ['.html', '.css', '.js', '.json', '.svg', '.xml'].includes(ext);

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      return res.end();
    }

    if (isCompressible && acceptEncoding.includes('gzip')) {
      zlib.gzip(contents, (zipErr, compressed) => {
        if (zipErr) {
          res.writeHead(200, headers);
          return res.end(contents);
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        return res.end(compressed);
      });
    } else {
      res.writeHead(200, headers);
      return res.end(contents);
    }
  });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    if (!res.headersSent) sendJson(res, 500, { error: 'Erro interno do servidor.' });
    else res.destroy(error);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Stopcell rodando em http://localhost:${PORT}`);
});
