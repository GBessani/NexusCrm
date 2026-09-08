import 'dotenv/config'
import express from 'express'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import pino from 'pino'

const PORT = process.env.PORT || 3001
const AUTH_TOKEN = process.env.AUTH_TOKEN // segredo compartilhado entre app e worker
const AUTH_DIR = process.env.AUTH_DIR || 'auth_info' // aponte pro volume persistente em produção

let sock
let isReady = false
let lastQR = null
const contatos = new Map() // jid -> { numero, nome }

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  // busca a versão atual do WhatsApp Web — evita o erro 405 por protocolo defasado
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`Usando WhatsApp Web v${version.join('.')} (mais recente: ${isLatest})`)

  sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.ubuntu('ListaDesejos'),
    logger: pino({ level: 'silent' }),
  })

  sock.ev.on('creds.update', saveCreds)

  // ---- captura de contatos (várias fontes, porque o WhatsApp é irregular) ----
  function registrar(fonte, lista) {
    let novos = 0
    for (const c of lista || []) {
      const jid = c.id || c.jid || ''
      if (!jid.endsWith('@s.whatsapp.net')) continue
      const numero = jid.split('@')[0]
      if (!/^\d{8,15}$/.test(numero)) continue
      const nome = c.name || c.notify || c.verifiedName || c.pushName || null
      const existente = contatos.get(jid)
      if (!existente) novos++
      contatos.set(jid, { numero, nome: nome || existente?.nome || null })
    }
    if (novos > 0) {
      console.log(`👥 [${fonte}] +${novos} contatos (total: ${contatos.size})`)
    }
  }

  sock.ev.on('contacts.upsert', (c) => registrar('upsert', c))
  sock.ev.on('contacts.update', (c) => registrar('update', c))
  sock.ev.on('messaging-history.set', ({ contacts }) => registrar('history', contacts))
  // mensagens que chegam também revelam contatos (pushName)
  sock.ev.on('messages.upsert', ({ messages }) => {
    const derivados = (messages || [])
      .map((m) => ({ id: m.key?.remoteJid, name: m.pushName }))
      .filter((x) => x.id)
    registrar('msg', derivados)
  })
  // chats também trazem jids de contatos
  sock.ev.on('chats.upsert', (chats) => {
    registrar('chats', (chats || []).map((ch) => ({ id: ch.id, name: ch.name })))
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      lastQR = qr
      console.log(`📱 QR atualizado — abra no navegador: http://localhost:${PORT}/qr`)
    }

    if (connection === 'open') {
      isReady = true
      lastQR = null
      console.log('✅ Conectado ao WhatsApp')
      console.log('   Aguardando o WhatsApp enviar os contatos... (pode levar minutos)')
    }

    if (connection === 'close') {
      isReady = false
      contatos.clear()
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      const deslogado = code === DisconnectReason.loggedOut
      console.log(`⚠️  Conexão fechada (code ${code}).`)
      if (deslogado) {
        console.log(`Sessão encerrada. Apague a pasta "${AUTH_DIR}" e reinicie pra gerar novo QR.`)
      } else {
        console.log('Reconectando em 5s...')
        setTimeout(startSock, 5000)
      }
    }
  })
}

// transforma "44 99999-9999" / "+5544999999999" em só dígitos
function toDigits(phone) {
  return String(phone).replace(/\D/g, '')
}

const app = express()
app.use(express.json())

// healthcheck sem token (pro Railway/Render monitorarem)
app.get('/status', (req, res) => {
  res.json({ connected: isReady })
})

// QR como imagem PNG (nítida, fácil de escanear)
app.get('/qr.png', async (req, res) => {
  if (!lastQR) return res.status(404).end()
  try {
    const buf = await QRCode.toBuffer(lastQR, { width: 320, margin: 2 })
    res.type('png').send(buf)
  } catch {
    res.status(500).end()
  }
})

// página pra parear o WhatsApp pelo navegador
app.get('/qr', (req, res) => {
  res.send(`<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conectar WhatsApp — PDFinder</title>
<style>
  body{font-family:system-ui,sans-serif;text-align:center;padding:40px 16px;color:#1a1a1a}
  img{width:320px;height:320px;border:1px solid #eee;border-radius:12px}
  .ok{color:#16a34a}
  .muted{color:#888;font-size:14px}
</style></head>
<body>
  <h2 id="title">Escaneie no WhatsApp</h2>
  <p class="muted">Aparelhos conectados &rarr; Conectar um aparelho</p>
  <div id="box"><img id="qr" src="/qr.png" alt="QR code"></div>
  <p class="muted">O codigo atualiza sozinho. Mantenha esta aba aberta.</p>
<script>
  async function tick(){
    try{
      const s = await fetch('/status').then(r=>r.json())
      if(s.connected){
        document.getElementById('title').innerHTML = '<span class="ok">WhatsApp conectado!</span>'
        document.getElementById('box').innerHTML = '<p>Pode fechar esta aba.</p>'
        return
      }
    }catch(e){}
    var img = document.getElementById('qr')
    if(img) img.src = '/qr.png?t=' + Date.now()
    setTimeout(tick, 8000)
  }
  tick()
</script>
</body></html>`)
})

// auth simples por header
function requireAuth(req, res, next) {
  if (!AUTH_TOKEN || req.headers['x-auth-token'] !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'não autorizado' })
  }
  next()
}

app.post('/send', requireAuth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'whatsapp não conectado' })

  const { phone, message } = req.body || {}
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone e message são obrigatórios' })
  }

  try {
    const digits = toDigits(phone)
    const [info] = await sock.onWhatsApp(`${digits}@s.whatsapp.net`)
    if (!info?.exists) {
      return res.status(404).json({ error: 'número não tem WhatsApp', phone })
    }

    await sock.sendMessage(info.jid, { text: message })
    res.json({ ok: true, jid: info.jid })
  } catch (err) {
    console.error('Erro ao enviar:', err)
    res.status(500).json({ error: 'falha ao enviar' })
  }
})

// envia um DOCUMENTO (PDF) com legenda. Baixa o arquivo a partir de fileUrl.
app.post('/send-doc', requireAuth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'whatsapp não conectado' })

  const { phone, message, fileUrl, fileName } = req.body || {}
  if (!phone || !fileUrl) {
    return res.status(400).json({ error: 'phone e fileUrl são obrigatórios' })
  }

  try {
    const digits = toDigits(phone)
    const [info] = await sock.onWhatsApp(`${digits}@s.whatsapp.net`)
    if (!info?.exists) {
      return res.status(404).json({ error: 'número não tem WhatsApp', phone })
    }

    // baixa o PDF a partir da URL (ex.: signed URL do Supabase Storage)
    const resp = await fetch(fileUrl)
    if (!resp.ok) {
      return res.status(502).json({ error: 'não foi possível baixar o arquivo' })
    }
    const buffer = Buffer.from(await resp.arrayBuffer())

    await sock.sendMessage(info.jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName: fileName || 'documento.pdf',
      caption: message || undefined,
    })
    res.json({ ok: true, jid: info.jid })
  } catch (err) {
    console.error('Erro ao enviar documento:', err)
    res.status(500).json({ error: 'falha ao enviar documento' })
  }
})

app.get('/contatos', requireAuth, (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'whatsapp não conectado' })
  const lista = Array.from(contatos.values())
    .map((c) => ({ numero: c.numero, nome: c.nome }))
    .sort((a, b) => (a.nome || a.numero).localeCompare(b.nome || b.numero))
  res.json({ total: lista.length, contatos: lista })
})

app.listen(PORT, () => {
  console.log(`🚀 Worker WhatsApp na porta ${PORT}`)
  console.log(`   Para conectar, abra no navegador: http://localhost:${PORT}/qr`)
  startSock()
})