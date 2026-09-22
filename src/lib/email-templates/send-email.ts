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

let cachedSenderAddress: string | null = null

/** Resolves the connected Gmail account's address (cached per server instance). */
async function getSenderAddress(): Promise<string> {
  if (cachedSenderAddress) return cachedSenderAddress
  const res = await fetch(`${GATEWAY_URL}/users/me/profile`, {
    headers: gatewayHeaders(),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error(`Gmail profile lookup failed [${res.status}]: ${body}`)
    throw new Error(`Gmail profile lookup failed [${res.status}]: ${body}`)
  }
  const data = (await res.json()) as { emailAddress?: string }
  if (!data.emailAddress) {
    throw new Error('Gmail profile lookup returned no email address')
  }
  cachedSenderAddress = data.emailAddress
  return cachedSenderAddress
}

const b64url = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** RFC 2047 encodes non-ASCII subject/display-name values. */
const header = (v: string) =>
  /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64url(v).replace(/-/, '+').replace(/_/, '/')}?=`

interface RawEmailInput {
  fromAddress: string
  to: string
  replyTo?: string
  subject: string
  html: string
  text: string
}

function buildRawEmail({ fromAddress, to, replyTo, subject, html, text }: RawEmailInput): string {
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
  return b64url(message)
}

/**
 * Renders a registered template and sends it through the connected Gmail
 * account via the connector gateway. Any failure throws so callers can log
 * the reason and release their retry claims.
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

  const fromAddress = await getSenderAddress()
  const raw = buildRawEmail({
    fromAddress,
    to: recipient,
    replyTo: options.replyTo,
    subject,
    html,
    text,
  })

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
