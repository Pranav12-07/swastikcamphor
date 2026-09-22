import React from 'react'
import { Body, Button, Column, Container, Head, Heading, Hr, Html, Preview, Row, Section, Text } from '@react-email/components'
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
  receiptUrl = '',
  items = [],
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Order ${orderNumber} confirmed — ${inr(total)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandHeader}>
          <Text style={brand}>Swastik</Text>
          <Text style={brandSub}>CAMPHOR</Text>
          <Text style={brandPromise}>100% Purity, 100% Positivity</Text>
        </Section>
        <Section style={successPanel}>
          <Text style={successMark}>✓</Text>
          <Heading style={h1}>Order Confirmed!</Heading>
          <Text style={greeting}>Thank you for your purchase, <strong>{customerName}</strong></Text>
          <Text style={value}>Your order has been successfully placed{paymentMethod === 'cod' ? '.' : ' and your payment has been received.'}</Text>
        </Section>
        <Section style={summaryPanel}>
          <Row>
            <Column style={summaryColumn}>
              <Text style={miniLabel}>ORDER NUMBER</Text>
              <Text style={summaryValue}>#{orderNumber}</Text>
            </Column>
            <Column style={summaryColumn}>
              <Text style={miniLabel}>ORDER DATE</Text>
              <Text style={summaryValue}>{placedAt || 'Confirmed'}</Text>
            </Column>
            <Column style={summaryColumnLast}>
              <Text style={miniLabel}>ORDER STATUS</Text>
              <Text style={statusPill}>{orderStatus}</Text>
            </Column>
          </Row>
        </Section>
        <Section style={detailsPanel}>
          <Row>
            <Column style={halfColumn}>
              <Text style={label}>CUSTOMER DETAILS</Text>
              <Text style={value}><strong>{customerName}</strong>{email ? <><br />{email}</> : null}{phone ? <><br />{phone}</> : null}</Text>
            </Column>
            <Column style={halfColumnLast}>
              <Text style={label}>DELIVERY ADDRESS</Text>
              <Text style={value}>{address}</Text>
            </Column>
          </Row>
        </Section>
        <Section style={detailsPanel}>
          <Text style={label}>ITEMS ORDERED</Text>
          <Row style={tableHead}>
            <Column style={productColumn}><Text style={tableLabel}>PRODUCT</Text></Column>
            <Column style={qtyColumn}><Text style={tableLabel}>QTY</Text></Column>
            <Column style={priceColumn}><Text style={tableLabel}>PRICE</Text></Column>
          </Row>
          {items.map((it, i) => (
            <Row key={i} style={itemRow}>
              <Column style={productColumn}><Text style={itemText}><strong>{it.name}</strong>{it.size ? <><br /><span style={mutedInline}>{it.size}</span></> : null}</Text></Column>
              <Column style={qtyColumn}><Text style={itemText}>{it.qty}</Text></Column>
              <Column style={priceColumn}><Text style={itemText}>{inr((it.price ?? 0) * (it.qty ?? 0))}</Text></Column>
            </Row>
          ))}
          <Hr style={hr} />
          <Row><Column><Text style={totalsLabel}>Subtotal</Text></Column><Column><Text style={totalsValue}>{inr(subtotal)}</Text></Column></Row>
          {discount ? <Row><Column><Text style={totalsLabel}>Discount</Text></Column><Column><Text style={discountValue}>-{inr(discount)}</Text></Column></Row> : null}
          {tax ? <Row><Column><Text style={totalsLabel}>GST / tax</Text></Column><Column><Text style={totalsValue}>{inr(tax)}</Text></Column></Row> : null}
          <Row><Column><Text style={totalsLabel}>Shipping</Text></Column><Column><Text style={totalsValue}>{shipping ? inr(shipping) : 'Free'}</Text></Column></Row>
          <Row style={totalRow}><Column><Text style={totalStyle}>{paymentMethod === 'cod' ? 'Total Due' : 'Total Paid'}</Text></Column><Column><Text style={totalAmount}>{inr(total)}</Text></Column></Row>
        </Section>
        <Section style={detailsPanel}>
          <Text style={label}>PAYMENT DETAILS</Text>
          <Text style={value}><strong>{paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI / PhonePe'}</strong> &nbsp; <span style={paymentPill}>{paymentStatus.toUpperCase()}</span></Text>
          {transactionId ? <Text style={muted}>Transaction ID: {transactionId}</Text> : null}
        </Section>
        {orderUrl || receiptUrl ? (
          <Section style={{ marginTop: '20px' }}>
            {orderUrl ? (
              <Button href={orderUrl} style={button}>
                View My Order
              </Button>
            ) : null}
            {receiptUrl ? (
              <Button href={receiptUrl} style={ghostButton}>
                Download PDF Receipt
              </Button>
            ) : null}
          </Section>
        ) : null}
        {receiptUrl ? (
          <Text style={muted}>Your branded PDF receipt is ready — tap “Download PDF Receipt” above for the official copy.</Text>
        ) : null}
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
    receiptUrl: 'https://swastikcamphor.lovable.app/receipt/SCLK92X1.pdf',
    items: [{ name: 'Camphor Tablets', size: '100g', qty: 2, price: 199 }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#fffaf4', fontFamily: 'Arial, sans-serif', margin: '0', padding: '24px 8px' }
const container = { maxWidth: '680px', margin: '0 auto', backgroundColor: '#fffdf9', border: '1px solid #eadfd4', borderRadius: '12px', padding: '22px' }
const brandHeader = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '38px', fontWeight: 'bold' as const, lineHeight: '1', margin: '0' }
const brandSub = { color: '#8d0b1b', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '4px', margin: '5px 0' }
const brandPromise = { color: '#a36d21', fontSize: '11px', letterSpacing: '1px', margin: '7px 0 0' }
const successPanel = { backgroundColor: '#fff4f3', border: '1px solid #f1ddda', borderRadius: '10px', padding: '24px', textAlign: 'center' as const }
const successMark = { backgroundColor: '#218c4a', borderRadius: '999px', color: '#ffffff', display: 'inline-block', fontSize: '26px', fontWeight: 'bold' as const, height: '42px', lineHeight: '42px', margin: '0 0 9px', width: '42px' }
const h1 = { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#8d0b1b', margin: '0 0 6px' }
const greeting = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '18px', margin: '0 0 7px' }
const summaryPanel = { backgroundColor: '#ffffff', border: '1px solid #eadfd4', borderRadius: '9px', marginTop: '12px', padding: '15px' }
const summaryColumn = { borderRight: '1px solid #eadfd4', padding: '0 12px', verticalAlign: 'top' as const, width: '33%' }
const summaryColumnLast = { padding: '0 12px', verticalAlign: 'top' as const, width: '34%' }
const miniLabel = { color: '#8d0b1b', fontSize: '10px', fontWeight: 'bold' as const, letterSpacing: '1px', margin: '0 0 6px' }
const summaryValue = { color: '#17233a', fontSize: '13px', fontWeight: 'bold' as const, margin: '0' }
const statusPill = { backgroundColor: '#d9f4df', borderRadius: '999px', color: '#21743d', display: 'inline-block', fontSize: '10px', fontWeight: 'bold' as const, padding: '6px 9px', margin: '0' }
const detailsPanel = { backgroundColor: '#ffffff', border: '1px solid #eadfd4', borderRadius: '9px', marginTop: '12px', padding: '16px' }
const halfColumn = { borderRight: '1px solid #eadfd4', paddingRight: '16px', verticalAlign: 'top' as const, width: '50%' }
const halfColumnLast = { paddingLeft: '16px', verticalAlign: 'top' as const, width: '50%' }
const muted = { color: '#6e7480', fontSize: '12px', lineHeight: '1.5' }
const mutedInline = { color: '#6e7480', fontSize: '12px' }
const hr = { borderColor: '#eadfd4', margin: '12px 0' }
const label = { fontSize: '11px', fontWeight: 'bold' as const, letterSpacing: '1.5px', color: '#8d0b1b', margin: '0 0 10px' }
const value = { fontSize: '13px', color: '#17233a', lineHeight: '1.55', margin: '0 0 4px' }
const tableHead = { backgroundColor: '#f8f6f3' }
const tableLabel = { color: '#596170', fontSize: '10px', fontWeight: 'bold' as const, margin: '7px 5px' }
const productColumn = { padding: '0 5px', width: '65%' }
const qtyColumn = { padding: '0 5px', textAlign: 'center' as const, width: '12%' }
const priceColumn = { padding: '0 5px', textAlign: 'right' as const, width: '23%' }
const itemRow = { borderBottom: '1px solid #eee7df' }
const itemText = { color: '#17233a', fontSize: '13px', lineHeight: '1.4', margin: '9px 5px' }
const totalsLabel = { color: '#596170', fontSize: '12px', margin: '3px 0' }
const totalsValue = { color: '#17233a', fontSize: '12px', margin: '3px 0', textAlign: 'right' as const }
const discountValue = { color: '#21743d', fontSize: '12px', margin: '3px 0', textAlign: 'right' as const }
const totalRow = { backgroundColor: '#fff0ef' }
const totalStyle = { fontSize: '18px', fontWeight: 'bold' as const, color: '#8d0b1b', margin: '10px 8px' }
const totalAmount = { fontSize: '20px', fontWeight: 'bold' as const, color: '#8d0b1b', margin: '10px 8px', textAlign: 'right' as const }
const paymentPill = { backgroundColor: '#d9f4df', borderRadius: '999px', color: '#21743d', fontSize: '10px', fontWeight: 'bold' as const, padding: '5px 9px' }
const thankYouPanel = { backgroundColor: '#fff0ef', borderRadius: '9px', marginTop: '12px', padding: '15px', textAlign: 'center' as const }
const thankYou = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 'bold' as const, margin: '0' }
const footer = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: '1.6', margin: '20px 0 4px', textAlign: 'center' as const }
const button = {
  backgroundColor: '#8d0b1b',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '999px',
  fontSize: '14px',
  textDecoration: 'none',
}
const ghostButton = {
  border: '1px solid #8d0b1b',
  color: '#8d0b1b',
  padding: '11px 20px',
  borderRadius: '999px',
  fontSize: '14px',
  textDecoration: 'none',
  marginLeft: '10px',
}
