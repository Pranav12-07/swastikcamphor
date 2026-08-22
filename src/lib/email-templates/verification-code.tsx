import * as React from 'react'

import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'

interface VerificationCodeEmailProps {
  /** The 6-digit one-time code. Delivered only by email — never shown in the app. */
  token: string
}

/** Swastik Camphor branded OTP email used for sign-in and first-time sign-up. */
export const VerificationCodeEmail = ({ token }: VerificationCodeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Swastik Camphor verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>SWASTIK CAMPHOR</Text>
        <Text style={estd}>ESTD 1968</Text>
        <Heading style={h1}>Your verification code is:</Heading>
        <Section style={codeBox}>
          <Text style={code}>{token}</Text>
        </Section>
        <Text style={text}>This code expires in 5 minutes.</Text>
        <Text style={text}>Do not share this code with anyone.</Text>
        <Text style={footer}>
          If you didn&apos;t request this code, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default VerificationCodeEmail

const main = { backgroundColor: '#faf7f2', fontFamily: 'Georgia, "Times New Roman", serif', padding: '24px 0' }
const container = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #eadfce',
  padding: '32px 28px',
  maxWidth: '520px',
}
const brand = {
  fontSize: '18px',
  letterSpacing: '4px',
  color: '#8c1c13',
  fontWeight: 'bold' as const,
  margin: '0',
}
const estd = { fontSize: '11px', letterSpacing: '3px', color: '#b08d57', margin: '4px 0 28px' }
const h1 = { fontSize: '18px', color: '#241c15', margin: '0 0 16px', fontWeight: 'normal' as const }
const codeBox = {
  backgroundColor: '#fdf6ec',
  border: '1px solid #e6d3ae',
  borderRadius: '10px',
  padding: '18px 0',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const code = {
  fontSize: '34px',
  letterSpacing: '12px',
  fontWeight: 'bold' as const,
  color: '#8c1c13',
  margin: '0',
  fontFamily: 'Arial, sans-serif',
}
const text = { fontSize: '14px', color: '#4a4038', lineHeight: '1.6', margin: '0 0 8px' }
const footer = { fontSize: '12px', color: '#9a8f84', margin: '26px 0 0' }
