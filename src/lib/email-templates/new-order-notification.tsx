import React from 'react'
import {
  Body,
  Button,
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
  city?: string
  state?: string
  pincode?: string
  paymentMethod?: string
  paymentStatus?: string
  transactionId?: string
  placedAt?: string
  subtotal?: number
  shipping?: number
  discount?: number
  stealDealDiscount?: number
  tax?: number
  total?: number
  adminUrl?: string
  receiptUrl?: string
  items?: OrderItem[]
}

const inr = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString('en-IN')}`

const Email = ({
  orderNumber = '—',
  customerName = 'Customer',
  email = '',
  phone = '',
  address = '',
  city = '',
  state = '',
  pincode = '',
  paymentMethod = 'upi',
  paymentStatus = 'paid',
  transactionId = '',
  placedAt = '',
  subtotal = 0,
  shipping = 0,
  discount = 0,
  stealDealDiscount = 0,
  tax = 0,
  total = 0,
  adminUrl = '',
  receiptUrl = '',
  items = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New order ${orderNumber} — ${inr(total)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New order received</Heading>
        <Text style={muted}>
          Order #{orderNumber}
          {placedAt ? ` • ${placedAt} IST` : ''}
        </Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Customer information</Text>
          <Text style={value}>
            {customerName}
            <br />
            {email}
            <br />
            {phone}
          </Text>
          <Text style={label}>Delivery information</Text>
          <Text style={value}>
            {address}
            <br />
            {[city, state, pincode].filter(Boolean).join(', ')}
          </Text>
          <Text style={label}>Payment</Text>
          <Text style={value}>
            {paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI / PhonePe'} — {paymentStatus.toUpperCase()}
          </Text>
          {transactionId ? <Text style={value}>Transaction ID: {transactionId}</Text> : null}
        </Section>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Order items</Text>
          {items.map((it, i) => (
            <Text key={i} style={value}>
              {it.name} ({it.size}) x {it.qty} — {inr((it.price ?? 0) * (it.qty ?? 0))}
            </Text>
          ))}
          <Text style={value}>Subtotal: {inr(subtotal)}</Text>
          {discount ? <Text style={value}>Discount: -{inr(discount)}</Text> : null}
          {stealDealDiscount ? <Text style={value}>Steal Deal (Twin Pack): -{inr(stealDealDiscount)}</Text> : null}
          {tax ? <Text style={value}>GST / tax: {inr(tax)}</Text> : null}
          <Text style={value}>Shipping: {shipping ? inr(shipping) : 'Free'}</Text>
          <Text style={totalStyle}>Total: {inr(total)}</Text>
        </Section>
        {adminUrl ? (
          <Section style={{ marginTop: '18px' }}>
            <Button href={adminUrl} style={button}>
              Open in admin
            </Button>
          </Section>
        ) : null}
        {receiptUrl ? (
          <Section style={{ marginTop: '12px' }}>
            <Text style={value}>
              <a href={receiptUrl} style={{ color: '#6b1220' }}>
                Download PDF receipt (secure link)
              </a>
            </Text>
          </Section>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `New Order Received - #${data['orderNumber'] ?? ''} - ${inr(data['total'])}`,
  displayName: 'New order notification',
  
  previewData: {
    orderNumber: 'SCLK92X1',
    customerName: 'Ramesh Kumar',
    email: 'ramesh@example.com',
    phone: '+91 90000 00000',
    address: 'Plot 185, Shaikpet',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500008',
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    transactionId: 'T2408221530123456',
    placedAt: '22 Aug 2026, 3:30 pm',
    subtotal: 398,
    shipping: 49,
    discount: 0,
    tax: 0,
    total: 447,
    adminUrl: 'https://swastikcamphor.lovable.app/admin/orders',
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
const button = {
  backgroundColor: '#6b1220',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '999px',
  fontSize: '14px',
  textDecoration: 'none',
}
