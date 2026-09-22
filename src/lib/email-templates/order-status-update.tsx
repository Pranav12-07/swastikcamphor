import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
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
        <Section style={brandHeader}>
          <Text style={brand}>Swastik</Text>
          <Text style={brandSub}>CAMPHOR</Text>
          <Text style={brandPromise}>100% Purity, 100% Positivity</Text>
        </Section>
        <Section style={statusHero}>
          <Text style={statusMark}>✓</Text>
          <Heading style={h1}>Your order is {statusLabel.toLowerCase()}</Heading>
          <Text style={muted}>Namaste {customerName}, here is the latest update on your order.</Text>
        </Section>
        <Section style={orderStrip}>
          <Text style={miniLabel}>ORDER NUMBER</Text>
          <Text style={orderNumberStyle}>#{orderNumber}</Text>
        </Section>
        <Section style={detailsPanel}>
          <Text style={label}>Current status</Text>
          <Text style={statusPill}>{statusLabel}</Text>
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
          {trackUrl ? <Button href={trackUrl} style={button}>Track My Order</Button> : null}
        </Section>
        <Section style={thankYouPanel}>
          <Text style={thankYou}>Thank you</Text>
          <Text style={value}>for choosing Swastik Camphor.</Text>
          <Text style={brandPromise}>100% PURITY &nbsp; • &nbsp; 100% POSITIVITY</Text>
        </Section>
        <Text style={footer}>Thank you for being a part of the <strong>Swastik family!</strong><br />Questions? Reply to this email or call +91 7416886881.</Text>
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

const main = { backgroundColor: '#fffaf4', fontFamily: 'Arial, sans-serif', margin: '0', padding: '24px 8px' }
const container = { maxWidth: '620px', margin: '0 auto', backgroundColor: '#fffdf9', border: '1px solid #eadfd4', borderRadius: '12px', padding: '22px' }
const brandHeader = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '38px', fontWeight: 'bold' as const, lineHeight: '1', margin: '0' }
const brandSub = { color: '#8d0b1b', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '4px', margin: '5px 0' }
const brandPromise = { color: '#a36d21', fontSize: '11px', letterSpacing: '1px', margin: '7px 0 0' }
const statusHero = { backgroundColor: '#fff4f3', border: '1px solid #f1ddda', borderRadius: '10px', padding: '24px', textAlign: 'center' as const }
const statusMark = { backgroundColor: '#8d0b1b', borderRadius: '999px', color: '#ffffff', display: 'inline-block', fontSize: '22px', fontWeight: 'bold' as const, height: '38px', lineHeight: '38px', margin: '0 0 10px', width: '38px' }
const h1 = { fontFamily: 'Georgia, serif', fontSize: '25px', color: '#8d0b1b', margin: '0 0 8px' }
const muted = { color: '#6e7480', fontSize: '13px', lineHeight: '1.55' }
const orderStrip = { backgroundColor: '#ffffff', border: '1px solid #eadfd4', borderRadius: '9px', marginTop: '12px', padding: '14px 16px' }
const miniLabel = { color: '#8d0b1b', fontSize: '10px', fontWeight: 'bold' as const, letterSpacing: '1px', margin: '0 0 5px' }
const orderNumberStyle = { color: '#17233a', fontSize: '15px', fontWeight: 'bold' as const, margin: '0' }
const detailsPanel = { backgroundColor: '#ffffff', border: '1px solid #eadfd4', borderRadius: '9px', marginTop: '12px', padding: '18px' }
const label = { fontSize: '11px', fontWeight: 'bold' as const, letterSpacing: '1.3px', color: '#8d0b1b', margin: '15px 0 4px' }
const value = { fontSize: '14px', color: '#17233a', lineHeight: '1.55', margin: '0 0 5px' }
const statusPill = { backgroundColor: '#d9f4df', borderRadius: '999px', color: '#21743d', display: 'inline-block', fontSize: '12px', fontWeight: 'bold' as const, padding: '7px 12px', margin: '0 0 5px' }
const button = { backgroundColor: '#8d0b1b', borderRadius: '999px', color: '#ffffff', display: 'inline-block', fontSize: '14px', marginTop: '18px', padding: '12px 22px', textDecoration: 'none' }
const thankYouPanel = { backgroundColor: '#fff0ef', borderRadius: '9px', marginTop: '12px', padding: '15px', textAlign: 'center' as const }
const thankYou = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'bold' as const, margin: '0' }
const footer = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: '1.6', margin: '20px 0 4px', textAlign: 'center' as const }
