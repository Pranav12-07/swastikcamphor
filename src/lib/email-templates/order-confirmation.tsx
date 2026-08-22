import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
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
  paymentStatus?: string
  transactionId?: string
  orderStatus?: string
  subtotal?: number
  shipping?: number
  discount?: number
  tax?: number
  total?: number
  placedAt?: string
  orderUrl?: string
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
  paymentStatus = 'paid',
  transactionId = '',
  orderStatus = 'ORDER CONFIRMED',
  subtotal = 0,
  shipping = 0,
  discount = 0,
  tax = 0,
  total = 0,
  placedAt = '',
  orderUrl = '',
  items = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Order ${orderNumber} confirmed — ${inr(total)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thank you for your purchase, {customerName}! 🎉</Heading>
        <Text style={muted}>
          Order #{orderNumber}
          {placedAt ? ` • ${placedAt} IST` : ''}
        </Text>
        <Text style={value}>Your order has been successfully placed and your payment has been received.</Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Customer</Text>
          <Text style={value}>
            {customerName}
            {email ? <><br />{email}</> : null}
            {phone ? <><br />{phone}</> : null}
          </Text>
          <Text style={label}>Delivery address</Text>
          <Text style={value}>{address}</Text>
        </Section>
        <Hr style={hr} />
        <Section>
          <Text style={label}>Items</Text>
          {items.map((it, i) => (
            <Text key={i} style={value}>
              {it.name} ({it.size}) x {it.qty} — {inr((it.price ?? 0) * (it.qty ?? 0))}
            </Text>
          ))}
        </Section>
        <Hr style={hr} />
        <Section>
          <Text style={value}>Subtotal: {inr(subtotal)}</Text>
          {discount ? <Text style={value}>Discount: -{inr(discount)}</Text> : null}
          {tax ? <Text style={value}>GST / tax: {inr(tax)}</Text> : null}
          <Text style={value}>Shipping: {shipping ? inr(shipping) : 'Free'}</Text>
          <Text style={totalStyle}>Total paid: {inr(total)}</Text>
          <Text style={label}>Payment</Text>
          <Text style={value}>
            {paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI / PhonePe'} — {paymentStatus.toUpperCase()}
            {paymentStatus.toLowerCase() === 'paid' ? ' ✓' : ''}
          </Text>
          {transactionId ? <Text style={value}>Transaction ID: {transactionId}</Text> : null}
          <Text style={label}>Order status</Text>
          <Text style={value}>{orderStatus}</Text>
        </Section>
        {orderUrl ? (
          <Section style={{ marginTop: '20px' }}>
            <Button href={orderUrl} style={button}>
              View My Order
            </Button>
          </Section>
        ) : null}
        <Hr style={hr} />
        <Text style={muted}>
          Thank you for shopping with us! Questions? Reply to this email or call +91 7416886881. — Swastik Camphor,
          pure camphor since 1968.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Order Confirmed! Your Order #${data['orderNumber'] ?? ''} has been placed`,
  displayName: 'Customer order confirmation',
  previewData: {
    orderNumber: 'SCLK92X1',
    customerName: 'Ramesh Kumar',
    email: 'ramesh@example.com',
    phone: '+91 90000 00000',
    address: 'Plot 185, Shaikpet, Hyderabad 500008',
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    transactionId: 'T2408221530123456',
    orderStatus: 'ORDER CONFIRMED',
    subtotal: 398,
    shipping: 49,
    discount: 0,
    tax: 0,
    total: 447,
    placedAt: '22 Aug 2026, 3:30 pm',
    orderUrl: 'https://swastikcamphor.lovable.app/orders/SCLK92X1',
    items: [{ name: 'Camphor Tablets', size: '100g', qty: 2, price: 199 }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '21px', color: '#6b1220', margin: '0' }
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
