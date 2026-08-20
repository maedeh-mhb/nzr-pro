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

interface OrderConfirmationEmailProps {
  orderNumber?: string;
  customerName?: string;
  orderDate?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  total?: string;
  paymentMethod?: string;
}

export const OrderConfirmationEmail = ({
  orderNumber = "ORD-123",
  customerName = "Customer",
  orderDate = new Date().toLocaleDateString(),
  items = [],
  total = "0",
  paymentMethod = "Card",
}: OrderConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Order confirmation for {orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Confirmed!</Heading>
          <Text style={text}>Hello {customerName},</Text>
          <Text style={text}>
            Thank you for your order. We've received it and will process it shortly.
          </Text>

          <Section style={section}>
            <Text style={label}>Order Number: {orderNumber}</Text>
            <Text style={label}>Order Date: {orderDate}</Text>
            <Text style={label}>Payment Method: {paymentMethod}</Text>
          </Section>

          <Section style={section}>
            <Heading style={h2}>Order Items</Heading>
            {items.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column>{item.name}</Column>
                <Column>Qty: {item.quantity}</Column>
                <Column>{item.price}</Column>
              </Row>
            ))}
            <Row style={totalRow}>
              <Column style={totalLabel}>Total:</Column>
              <Column style={totalValue}>{total}</Column>
            </Row>
          </Section>

          <Text style={text}>
            We'll send you another email when your order ships.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

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
  marginTop: "10px",
  borderTop: "2px solid #333",
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

