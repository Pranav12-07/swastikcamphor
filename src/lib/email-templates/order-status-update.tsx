import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  orderNumber?: string
  customerName?: string
  status?: string
  statusLabel?: string
  note?: string
  courier?: string
  trackingNumber?: string
  expectedDelivery?: string
  trackUrl?: string
}

const Email = ({
  orderNumber = '—',
  customerName = 'Customer',
  statusLabel = 'Updated',
  note = '',
  courier = '',
  trackingNumber = '',
  expectedDelivery = '',
  trackUrl = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Order ${orderNumber} — ${statusLabel}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your order is {statusLabel.toLowerCase()}</Heading>
        <Text style={muted}>Namaste {customerName}, here is the latest on order {orderNumber}.</Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Current status</Text>
          <Text style={value}>{statusLabel}</Text>
          {note ? (
            <>
              <Text style={label}>Note from our team</Text>
              <Text style={value}>{note}</Text>
            </>
          ) : null}
          {courier ? (
            <>
              <Text style={label}>Courier</Text>
              <Text style={value}>{courier}</Text>
            </>
          ) : null}
          {trackingNumber ? (
            <>
              <Text style={label}>Tracking / AWB number</Text>
              <Text style={value}>{trackingNumber}</Text>
            </>
          ) : null}
          {expectedDelivery ? (
            <>
              <Text style={label}>Expected delivery</Text>
              <Text style={value}>{expectedDelivery}</Text>
            </>
          ) : null}
          {trackUrl ? (
            <>
              <Text style={label}>Track your order</Text>
              <Text style={value}>{trackUrl}</Text>
            </>
          ) : null}
        </Section>
        <Hr style={hr} />
        <Text style={muted}>
          Questions? Reply to this email or call +91 7416886881. — Swastik Camphor, pure camphor since 1968.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Swastik Camphor order ${data['orderNumber'] ?? ''} — ${data['statusLabel'] ?? 'update'}`,
  displayName: 'Customer order status update',
  previewData: {
    orderNumber: 'SCLK92X1',
    customerName: 'Ramesh Kumar',
    statusLabel: 'Shipped',
    note: 'Dispatched from our Hyderabad unit.',
    courier: 'Delhivery',
    trackingNumber: 'DL9284712',
    expectedDelivery: '26 August 2026',
    trackUrl: 'https://swastikcamphor.in/track-order',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '21px', color: '#6b1220', margin: '0' }
const muted = { color: '#7a7a7a', fontSize: '13px' }
const hr = { borderColor: '#e8dcc2' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, color: '#9a7b3f', margin: '14px 0 2px' }
const value = { fontSize: '14px', color: '#222', margin: '0 0 4px' }
