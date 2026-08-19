import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface OrderItem {
  name?: string
  size?: string
  qty?: number
  price?: number
}

interface Props {
  orderNumber?: string
  customerName?: string
  email?: string
  phone?: string
  address?: string
  paymentMethod?: string
  total?: number
  items?: OrderItem[]
}

const inr = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString('en-IN')}`

const Email = ({
  orderNumber = '—',
  customerName = 'Customer',
  email = '',
  phone = '',
  address = '',
  paymentMethod = 'upi',
  total = 0,
  items = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New order ${orderNumber} — ${inr(total)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New order received</Heading>
        <Text style={muted}>Order {orderNumber}</Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Customer</Text>
          <Text style={value}>
            {customerName}
            <br />
            {email}
            <br />
            {phone}
          </Text>
          <Text style={label}>Delivery address</Text>
          <Text style={value}>{address}</Text>
          <Text style={label}>Payment</Text>
          <Text style={value}>
            {paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI (awaiting reference)'}
          </Text>
        </Section>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Items</Text>
          {items.map((it, i) => (
            <Text key={i} style={value}>
              {it.name} ({it.size}) x {it.qty} — {inr((it.price ?? 0) * (it.qty ?? 0))}
            </Text>
          ))}
          <Text style={totalStyle}>Total: {inr(total)}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `New order ${data['orderNumber'] ?? ''} — ${inr(data['total'])}`,
  displayName: 'New order notification',
  to: 'info@swastikcamphor.in',
  previewData: {
    orderNumber: 'SCLK92X1',
    customerName: 'Ramesh Kumar',
    email: 'ramesh@example.com',
    phone: '+91 90000 00000',
    address: 'Plot 185, Shaikpet, Hyderabad 500008',
    paymentMethod: 'upi',
    total: 448,
    items: [{ name: 'Camphor Tablets', size: '100g', qty: 2, price: 149 }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', color: '#6b1220', margin: '0' }
const muted = { color: '#7a7a7a', fontSize: '13px' }
const hr = { borderColor: '#e8dcc2' }
const label = { fontSize: '12px', textTransform: 'uppercase' as const, color: '#9a7b3f', margin: '14px 0 2px' }
const value = { fontSize: '14px', color: '#222', margin: '0 0 4px' }
const totalStyle = { fontSize: '17px', color: '#6b1220', marginTop: '12px' }