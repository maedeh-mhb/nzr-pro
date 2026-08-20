import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

interface InvoiceEmailProps {
  orderNumber?: string;
  customerName?: string;
  orderDate?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  subtotal?: string;
  shipping?: string;
  discount?: string;
  total?: string;
}

export const InvoiceEmail = ({
  orderNumber = "ORD-123",
  customerName = "Customer",
  orderDate = new Date().toLocaleDateString(),
  items = [],
  subtotal = "0",
  shipping = "0",
  discount = "0",
  total = "0",
}: InvoiceEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Invoice for order {orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 24 }}>
            <img src="https://your-domain.com/images/logo.png" alt="Logo" style={{ maxWidth: 160, height: 'auto' }} />
          </div>
          <Heading style={h1}>Invoice</Heading>
          <Text style={text}>Hello {customerName},</Text>
          <Text style={text}>
            Thank you for your order. Here is your invoice:
          </Text>
          <Section style={section}>
            <Text style={label}>Order Number: {orderNumber}</Text>
            <Text style={label}>Order Date: {orderDate}</Text>
          </Section>

          <Section style={section}>
            <Heading style={h2}>Items</Heading>
            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column>{item.name}</Column>
                <Column>Qty: {item.quantity}</Column>
                <Column>{item.price}</Column>
              </Row>
            ))}
          </Section>

          <Section style={section}>
            <Row style={totalRow}>
              <Column>Subtotal:</Column>
              <Column>{subtotal}</Column>
            </Row>
            <Row style={totalRow}>
              <Column>Shipping:</Column>
              <Column>{shipping}</Column>
            </Row>
            <Row style={totalRow}>
              <Column>Discount:</Column>
              <Column>{discount}</Column>
            </Row>
            <Row style={totalRow}>
              <Column style={totalLabel}>Total:</Column>
              <Column style={totalValue}>{total}</Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default InvoiceEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
};

const h2 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "20px 0",
  padding: "0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const section = {
  margin: "20px 0",
  padding: "20px",
  backgroundColor: "#f9f9f9",
  borderRadius: "4px",
};

const label = {
  color: "#666",
  fontSize: "14px",
  margin: "5px 0",
};

const itemRow = {
  padding: "10px 0",
  borderBottom: "1px solid #eee",
};

const totalRow = {
  padding: "10px 0",
};

const totalLabel = {
  fontWeight: "bold",
  fontSize: "16px",
};

const totalValue = {
  fontWeight: "bold",
  fontSize: "18px",
  color: "#007ee6",
};

