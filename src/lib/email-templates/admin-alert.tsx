import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Detail {
  label?: string
  value?: string
}

interface Props {
  eventType?: string
  title?: string
  body?: string
  link?: string
  occurredAt?: string
  details?: Detail[]
}

const Email = ({
  eventType = 'update',
  title = 'Website update',
  body = '',
  link = '',
  occurredAt = '',
  details = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${title}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge}>{eventType.replace(/[._]/g, ' ').toUpperCase()}</Text>
        <Heading style={h1}>{title}</Heading>
        {occurredAt ? <Text style={muted}>{occurredAt} IST</Text> : null}
        <Hr style={hr} />
        {body ? <Text style={value}>{body}</Text> : null}
        {details.length > 0 && (
          <Section>
            {details.map((d, i) => (
              <Text key={i} style={value}>
                <span style={label}>{(d.label ?? '').replace(/_/g, ' ')}: </span>
                {d.value}
              </Text>
            ))}
          </Section>
        )}
        {link ? (
          <Text style={value}>
            Open in admin panel: https://swastikcamphor.in{link}
          </Text>
        ) : null}
        <Hr style={hr} />
        <Text style={muted}>Swastik Camphor — automated admin notification</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `[Swastik Camphor] ${data['title'] ?? 'Website update'}`,
  displayName: 'Admin activity alert',
  previewData: {
    eventType: 'order.status_changed',
    title: 'Order SCLK92X1 marked as shipped',
    body: 'Order status changed from processing to shipped.',
    link: '/admin/orders',
    occurredAt: '22 Aug 2026, 3:30 pm',
    details: [{ label: 'order_id', value: 'SCLK92X1' }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '24px', maxWidth: '560px' }
const badge = { fontSize: '11px', letterSpacing: '2px', color: '#9a7b3f', margin: '0 0 6px' }
const h1 = { fontSize: '20px', color: '#6b1220', margin: '0' }
const muted = { color: '#7a7a7a', fontSize: '13px' }
const hr = { borderColor: '#e8dcc2' }
const label = { color: '#9a7b3f' }
const value = { fontSize: '14px', color: '#222', margin: '0 0 6px' }
