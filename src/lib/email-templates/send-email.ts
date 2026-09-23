import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'

// Server-only. Order mail is sent only through the shop mailbox. Gmail is
// deliberately not a fallback because Gmail rewrites an unverified From header
// to the connected account's address.
const DISPLAY_NAME = 'Swastik Camphor'
const SHOP_EMAIL = 'shop@online.swastikcamphor.in'

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' | 'send_failed' }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Kept for API compatibility; delivery claims are managed by the order flow. */
  idempotencyKey?: string
  replyTo?: string
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
 * (shop@online.swastikcamphor.in on Hostinger). There is intentionally no Gmail
 * fallback: an SMTP failure must be retried rather than sent from a personal account.
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

  // Shop-only delivery. Never derive the envelope sender from the customer,
  // an admin account, or any environment variable.
  const { getSmtpConfig, smtpSend } = await import('@/lib/smtp.server')
  const smtp = getSmtpConfig()
  if (!smtp) {
    console.error(`[order-email-provider] blocked: SMTP_EMAIL_PASSWORD missing; provider=none; from=${SHOP_EMAIL}`)
    throw new Error('Shop email delivery is not configured')
  }

  const message = buildMessage({
    fromAddress: SHOP_EMAIL,
    to: recipient,
    replyTo: options.replyTo ?? SHOP_EMAIL,
    subject,
    html,
    text,
  })
  console.log(`[order-email-provider] sending provider=hostinger-smtp from=${SHOP_EMAIL} to=${recipient}`)
  try {
    await Promise.race([
      smtpSend({ config: smtp, from: SHOP_EMAIL, to: recipient, message }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Hostinger SMTP send timed out')), 20_000)
      ),
    ])
  } catch (error) {
    console.error(`[order-email-provider] failed provider=hostinger-smtp from=${SHOP_EMAIL} to=${recipient}`, error)
    throw error
  }
  console.log(`[order-email-provider] accepted provider=hostinger-smtp from=${SHOP_EMAIL} to=${recipient}`)
  return { sent: true }
}
