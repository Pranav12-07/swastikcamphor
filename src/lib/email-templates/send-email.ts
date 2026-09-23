import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'

// Server-only: reads LOVABLE_API_KEY and GOOGLE_MAIL_API_KEY. Never import from client components.
//
// Sending now goes through the connected Gmail account via the Lovable connector
// gateway. Gmail only delivers from the connected account's own address; the
// display name shown to recipients is "Swastik Camphor".

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1'
const DISPLAY_NAME = 'Swastik Camphor'
const SHOP_EMAIL = 'shop@online.swastikcamphor.in'

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' | 'send_failed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Kept for API compatibility; Gmail sending is direct and needs no dedupe key. */
  idempotencyKey?: string
  replyTo?: string
}

function gatewayHeaders(): Record<string, string> {
  const apiKey = process.env['LOVABLE_API_KEY']
  const connKey = process.env['GOOGLE_MAIL_API_KEY']
  if (!apiKey || !connKey) {
    throw new Error(
      'Gmail sending is not configured — LOVABLE_API_KEY or GOOGLE_MAIL_API_KEY is missing. Link the Gmail connection first.'
    )
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'X-Connection-Api-Key': connKey,
  }
}

const base64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''))

const b64url = (s: string) =>
  base64(s)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** RFC 2047 encodes non-ASCII subject/display-name values. */
const header = (v: string) =>
  /^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${base64(v)}?=`

interface RawEmailInput {
  fromAddress: string
  to: string
  replyTo: string | undefined
  subject: string
  html: string
  text: string
}

function buildMessage({ fromAddress, to, replyTo, subject, html, text }: RawEmailInput): string {
  const boundary = `swastik-${crypto.randomUUID().replace(/-/g, '')}`
  const message = [
    `From: ${DISPLAY_NAME} <${fromAddress}>`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${header(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return message
}

/**
 * Renders a registered template and sends it from the business mailbox
 * (shop@online.swastikcamphor.in on Hostinger) when SMTP credentials are configured,
 * otherwise through the connected Gmail account. Any failure throws so callers
 * can log the reason and release their retry claims.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // Preferred path: send from the business mailbox over Hostinger SMTP.
  // If Hostinger is temporarily unreachable, immediately use the connected
  // Gmail sender rather than leaving a paid order without confirmation.
  const { getSmtpConfig, smtpSend } = await import('@/lib/smtp.server')
  const smtp = getSmtpConfig()
  if (smtp) {
    const message = buildMessage({
      fromAddress: smtp.user,
      to: recipient,
      replyTo: options.replyTo,
      subject,
      html,
      text,
    })
    try {
      await Promise.race([
        smtpSend({ config: smtp, from: smtp.user, to: recipient, message }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Hostinger SMTP send timed out')), 20_000)
        ),
      ])
      return { sent: true }
    } catch (error) {
      console.error('Hostinger SMTP unavailable; retrying through connected Gmail', error)
    }
  }

  // Fallback path: send through the connected Gmail account, but present the
  // shop mailbox as the sender. Gmail honors this From once
  // shop@online.swastikcamphor.in is added as a verified "Send mail as" alias
  // on the connected account; until then Gmail substitutes the account address.
  const fromAddress = SHOP_EMAIL
  const raw = b64url(
    buildMessage({
      fromAddress,
      to: recipient,
      replyTo: options.replyTo ?? SHOP_EMAIL,
      subject,
      html,
      text,
    })
  )

  const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: 'POST',
    headers: { ...gatewayHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    console.error(`Gmail send failed [${res.status}]: ${errorBody}`)
    throw new Error(`Gmail send failed [${res.status}]: ${errorBody}`)
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } }
  if (data.error) {
    console.error(`Gmail send rejected: ${data.error.message}`)
    throw new Error(`Gmail send rejected: ${data.error.message}`)
  }

  return { sent: true }
}
