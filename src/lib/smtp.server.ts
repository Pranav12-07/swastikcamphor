/**
 * Minimal SMTP client for the Worker runtime (Hostinger mail).
 * Uses implicit TLS on port 465 via cloudflare:sockets.
 * Server-only — never import from client code.
 */

const SMTP_HOST = 'smtp.hostinger.com'
const SMTP_PORT = 465

export interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
}

export function getSmtpConfig(): SmtpConfig | null {
  const user = process.env['SMTP_EMAIL_USER'] || 'info@swastikcamphor.in'
  const password = process.env['SMTP_EMAIL_PASSWORD']
  if (!password) return null
  return {
    host: process.env['SMTP_HOST'] || SMTP_HOST,
    port: Number(process.env['SMTP_PORT'] || SMTP_PORT),
    user,
    password,
  }
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64(s: string): string {
  return btoa(Array.from(enc.encode(s), (b) => String.fromCharCode(b)).join(''))
}

interface Conn {
  write(s: string): Promise<void>
  read(): Promise<string>
}

async function expect(conn: Conn, codes: number[], step: string): Promise<string> {
  let buffer = ''
  // SMTP replies can span multiple lines; the final line has a space after the code.
  for (;;) {
    buffer += await conn.read()
    const lines = buffer.split(/\r?\n/).filter(Boolean)
    const last = lines[lines.length - 1]
    if (last && /^\d{3} /.test(last)) {
      const code = Number(last.slice(0, 3))
      if (!codes.includes(code)) {
        throw new Error(`SMTP ${step} failed: ${buffer.trim()}`)
      }
      return buffer
    }
  }
}

/**
 * Sends one already-built message. `body` must be the full RFC 5322 message
 * (headers + blank line + body) using CRLF line endings.
 */
export async function smtpSend(params: {
  config: SmtpConfig
  from: string
  to: string
  message: string
}): Promise<void> {
  const { connect } = await import('cloudflare:sockets')
  const socket = connect(
    { hostname: params.config.host, port: params.config.port },
    { secureTransport: 'on', allowHalfOpen: false }
  )

  const writer = socket.writable.getWriter()
  const reader = socket.readable.getReader()
  const conn: Conn = {
    async write(s) {
      await writer.write(enc.encode(s))
    },
    async read() {
      const { value, done } = await reader.read()
      if (done || !value) throw new Error('SMTP connection closed unexpectedly')
      return dec.decode(value)
    },
  }

  try {
    await expect(conn, [220], 'greeting')
    await conn.write(`EHLO swastikcamphor.in\r\n`)
    await expect(conn, [250], 'EHLO')

    await conn.write('AUTH LOGIN\r\n')
    await expect(conn, [334], 'AUTH')
    await conn.write(`${b64(params.config.user)}\r\n`)
    await expect(conn, [334], 'AUTH username')
    await conn.write(`${b64(params.config.password)}\r\n`)
    await expect(conn, [235], 'AUTH password')

    await conn.write(`MAIL FROM:<${params.from}>\r\n`)
    await expect(conn, [250], 'MAIL FROM')
    await conn.write(`RCPT TO:<${params.to}>\r\n`)
    await expect(conn, [250, 251], 'RCPT TO')
    await conn.write('DATA\r\n')
    await expect(conn, [354], 'DATA')

    // Dot-stuffing so a lone "." line cannot terminate the message early.
    const safe = params.message.replace(/\r?\n/g, '\r\n').replace(/\r\n\./g, '\r\n..')
    await conn.write(`${safe}\r\n.\r\n`)
    await expect(conn, [250], 'message body')

    await conn.write('QUIT\r\n')
  } finally {
    try {
      reader.releaseLock()
      writer.releaseLock()
      await socket.close()
    } catch {
      /* socket already closed */
    }
  }
}
