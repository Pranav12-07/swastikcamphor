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
  const user = 'shop@online.swastikcamphor.in'
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

function withTimeout<T>(promise: Promise<T>, label: string, ms = 12_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`SMTP ${label} timed out`)), ms)),
  ])
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
/** Opens a TLS connection: Cloudflare sockets in the Worker, node:tls locally. */
async function openConn(
  host: string,
  port: number,
  mode: 'tls' | 'starttls' = 'tls'
): Promise<{ conn: Conn; close: () => Promise<void>; upgrade?: () => Promise<void> }> {
  try {
    // Literal specifier: the Worker bundler must see this at build time —
    // a variable specifier cannot be resolved at runtime inside the Worker.
    const { connect } = (await import('cloudflare:sockets')) as unknown as {
      connect: (
        address: { hostname: string; port: number },
        options?: { secureTransport?: string; allowHalfOpen?: boolean }
      ) => any
    }
    let socket = connect(
      { hostname: host, port },
      { secureTransport: mode === 'tls' ? 'on' : 'starttls', allowHalfOpen: false }
    )
    await withTimeout(socket.opened, 'connection')
    let writer = socket.writable.getWriter()
    let reader = socket.readable.getReader()
    return {
      conn: {
        async write(s) {
          await writer.write(enc.encode(s))
        },
        async read() {
          const { value, done } = await reader.read()
          if (done || !value) throw new Error('SMTP connection closed unexpectedly')
          return dec.decode(value)
        },
      },
      upgrade:
        mode === 'starttls'
          ? async () => {
              reader.releaseLock()
              writer.releaseLock()
              socket = socket.startTls()
              writer = socket.writable.getWriter()
              reader = socket.readable.getReader()
            }
          : undefined,
      close: async () => {
        try {
          reader.releaseLock()
          writer.releaseLock()
          await socket.close()
        } catch {
          /* already closed */
        }
      },
    }
  } catch {
    // Dev/Node runtime: cloudflare:sockets is unavailable.
    const tlsModule = 'node:tls'
    const tls = (await import(/* @vite-ignore */ tlsModule)) as typeof import('node:tls')
    const socket = await withTimeout(
      new Promise<import('node:tls').TLSSocket>((resolve, reject) => {
        const s = tls.connect({ host, port, servername: host }, () => resolve(s))
        s.once('error', reject)
      }),
      'connection',
    )
    socket.setEncoding('utf8')
    const queue: string[] = []
    let waiter: ((v: string) => void) | null = null
    let failure: Error | null = null
    socket.on('data', (chunk: string) => {
      if (waiter) {
        const w = waiter
        waiter = null
        w(chunk)
      } else queue.push(chunk)
    })
    socket.on('error', (e: Error) => {
      failure = e
    })
    socket.on('close', () => {
      failure = failure ?? new Error('SMTP connection closed unexpectedly')
    })
    return {
      conn: {
        async write(s) {
          await new Promise<void>((resolve, reject) =>
            socket.write(s, (err) => (err ? reject(err) : resolve()))
          )
        },
        async read() {
          if (queue.length) return queue.shift() as string
          if (failure) throw failure
          return new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('SMTP read timed out')), 20000)
            waiter = (v) => {
              clearTimeout(timer)
              resolve(v)
            }
          })
        },
      },
      close: async () => {
        try {
          socket.destroy()
        } catch {
          /* already closed */
        }
      },
    }
  }
}

export async function smtpSend(params: {
  config: SmtpConfig
  from: string
  to: string
  message: string
}): Promise<void> {
  // Some hosts block outbound 465; fall back to the submission ports.
  const attempts: Array<{ port: number; mode: 'tls' | 'starttls' }> = [
    { port: params.config.port, mode: params.config.port === 587 ? 'starttls' : 'tls' },
    { port: 587, mode: 'starttls' },
    { port: 2525, mode: 'starttls' },
  ].filter((a, i, all) => all.findIndex((b) => b.port === a.port) === i)

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      await smtpSendOnce(params, attempt.port, attempt.mode)
      return
    } catch (error) {
      lastError = error
      console.error(`[smtp] attempt failed port=${attempt.port} mode=${attempt.mode}`, error)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('SMTP send failed')
}

async function smtpSendOnce(
  params: { config: SmtpConfig; from: string; to: string; message: string },
  port: number,
  mode: 'tls' | 'starttls'
): Promise<void> {
  const { conn, close, upgrade } = await openConn(params.config.host, port, mode)

  try {
    await expect(conn, [220], 'greeting')
    await conn.write(`EHLO swastikcamphor.in\r\n`)
    await expect(conn, [250], 'EHLO')

    if (upgrade) {
      await conn.write('STARTTLS\r\n')
      await expect(conn, [220], 'STARTTLS')
      await upgrade()
      await conn.write(`EHLO swastikcamphor.in\r\n`)
      await expect(conn, [250], 'EHLO (TLS)')
    }


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
    await close()
  }
}
