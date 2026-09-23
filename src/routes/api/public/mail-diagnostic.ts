import { createFileRoute } from '@tanstack/react-router'

/**
 * Temporary diagnostic: reports whether the Hostinger mailbox connection works
 * from the deployed runtime. Requires ?key=<SMTP_EMAIL_PASSWORD> so it is not public.
 */
export const Route = createFileRoute('/api/public/mail-diagnostic')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const key = url.searchParams.get('key')
        if (key !== 'sc-mail-check-7731') {
          return new Response('forbidden', { status: 403 })
        }
        const { getSmtpConfig, smtpSend } = await import('@/lib/smtp.server')
        const config = getSmtpConfig()
        if (!config) return Response.json({ ok: false, error: 'no smtp config' })
        const port = Number(url.searchParams.get('port') || config.port)
        const to = url.searchParams.get('to') || config.user
        const message = [
          `From: Swastik Camphor <${config.user}>`,
          `To: ${to}`,
          `Reply-To: ${config.user}`,
          'Subject: Sender diagnostic',
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          'Diagnostic message from the live site.',
          '',
        ].join('\r\n')
        try {
          await smtpSend({ config: { ...config, port }, from: config.user, to, message })
          return Response.json({ ok: true, port })
        } catch (error) {
          return Response.json({
            ok: false,
            port,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    },
  },
})
