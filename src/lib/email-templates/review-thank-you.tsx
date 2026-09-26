import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  customerName?: string
  productName?: string
  couponCode?: string
  couponAmount?: number
  minOrder?: number
  expiresAt?: string
}

const inr = (n?: number) => `Rs. ${Number(n ?? 0).toLocaleString('en-IN')}`

const Email = ({
  customerName = 'Customer',
  productName = 'your product',
  couponCode = '',
  couponAmount = 25,
  minOrder = 299,
  expiresAt = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Thank you for your review — here is ${inr(couponAmount)} off your next order`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandHeader}>
          <Text style={brand}>Swastik</Text>
          <Text style={brandSub}>CAMPHOR</Text>
          <Text style={brandPromise}>100% Purity, 100% Positivity</Text>
        </Section>
        <Section style={panel}>
          <Heading style={h1}>Thank you for your review 🙏</Heading>
          <Text style={value}>
            Dear <strong>{customerName}</strong>, thank you for sharing your honest review of{' '}
            <strong>{productName}</strong>. It helps other families choose with confidence.
          </Text>
          <Text style={value}>As a small thank-you, here is a coupon for your next order:</Text>
          <Section style={couponBox}>
            <Text style={couponCodeStyle}>{couponCode}</Text>
            <Text style={couponMeta}>
              {inr(couponAmount)} off on orders above {inr(minOrder)}
              {expiresAt ? ` • valid until ${expiresAt}` : ''}
            </Text>
          </Section>
          <Text style={muted}>
            Use the code at checkout on swastikcamphor.in. One use per customer.
          </Text>
        </Section>
        <Text style={footer}>
          With gratitude, the <strong>Swastik Camphor</strong> family
          <br />
          Questions? Reply to this email or call +91 7416886881.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Thank you for your review — ${inr(data['couponAmount'])} off your next order`,
  displayName: 'Review thank-you coupon',
  previewData: {
    customerName: 'Ramesh Kumar',
    productName: 'Camphor Tablets',
    couponCode: 'REVIEW-AB12CD',
    couponAmount: 25,
    minOrder: 299,
    expiresAt: '25 Nov 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#fffaf4', fontFamily: 'Arial, sans-serif', margin: '0', padding: '24px 8px' }
const container = { maxWidth: '620px', margin: '0 auto', backgroundColor: '#fffdf9', border: '1px solid #eadfd4', borderRadius: '12px', padding: '22px' }
const brandHeader = { textAlign: 'center' as const, padding: '8px 0 20px' }
const brand = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '38px', fontWeight: 'bold' as const, lineHeight: '1', margin: '0' }
const brandSub = { color: '#8d0b1b', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '4px', margin: '5px 0' }
const brandPromise = { color: '#a36d21', fontSize: '11px', letterSpacing: '1px', margin: '7px 0 0' }
const panel = { backgroundColor: '#ffffff', border: '1px solid #eadfd4', borderRadius: '9px', padding: '20px' }
const h1 = { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#8d0b1b', margin: '0 0 10px' }
const value = { fontSize: '13px', color: '#17233a', lineHeight: '1.55', margin: '0 0 10px' }
const couponBox = { backgroundColor: '#fff4f3', border: '1px dashed #8d0b1b', borderRadius: '10px', padding: '16px', textAlign: 'center' as const, margin: '6px 0 12px' }
const couponCodeStyle = { color: '#8d0b1b', fontFamily: 'monospace', fontSize: '26px', fontWeight: 'bold' as const, letterSpacing: '3px', margin: '0' }
const couponMeta = { color: '#596170', fontSize: '12px', margin: '6px 0 0' }
const muted = { color: '#6e7480', fontSize: '12px', lineHeight: '1.5' }
const footer = { color: '#8d0b1b', fontFamily: 'Georgia, serif', fontSize: '13px', lineHeight: '1.6', margin: '20px 0 4px', textAlign: 'center' as const }
