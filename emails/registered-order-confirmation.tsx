import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Heading,
  Hr,
  Link,
} from "@react-email/components";
import * as React from "react";

interface RegisteredOrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  orderDate: string;
  items: Array<{ name: string; quantity: number; price: string }>;
  total: string;
  paymentMethod?: string;
  paymentMethodDisplay: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  contactAddress?: string | null;
  contactAddressFa?: string | null;
  contactEmail?: string | null;
  language?: "en" | "fa";
}

export const RegisteredOrderConfirmationEmail = ({
  orderNumber,
  customerName,
  orderDate,
  items,
  total,
  paymentMethod,
  paymentMethodDisplay,
  telegram,
  instagram,
  whatsapp,
  contactAddress,
  contactAddressFa,
  contactEmail,
  language = "fa",
}: RegisteredOrderConfirmationEmailProps) => {
  const displayAddress = language === "fa" && contactAddressFa ? contactAddressFa : contactAddress;

  // Format total
  const totalFormatted = language === "fa"
    ? `${parseFloat(total).toLocaleString("fa-IR")} تومان`
    : `${parseFloat(total).toLocaleString()} Toman`;

  // Translations
  const isCardToCard = paymentMethod === "card_to_card";
  const orderConfirmedText = language === "fa" 
    ? (isCardToCard ? "سفارش شما ثبت اولیه شد!" : "سفارش شما ثبت شد!")
    : (isCardToCard ? "Your order is preliminary confirmed!" : "Your order is confirmed!");
  const thankYouText = language === "fa"
    ? `از خرید شما متشکریم ${customerName}! سفارش شما با موفقیت ثبت شد و در حال پردازش است.`
    : `Thank you for your purchase ${customerName}! Your order has been successfully placed and is being processed.`;
  const orderDetailsText = language === "fa" ? "جزئیات سفارش:" : "Order Details:";
  const orderNumberLabel = language === "fa" ? "شماره سفارش:" : "Order Number:";
  const orderDateLabel = language === "fa" ? "تاریخ سفارش:" : "Order Date:";
  const paymentMethodLabel = language === "fa" ? "روش پرداخت:" : "Payment Method:";
  const orderItemsText = language === "fa" ? "اقلام سفارش:" : "Order Items:";
  const quantityText = language === "fa" ? "تعداد:" : "Quantity:";
  const priceText = language === "fa" ? "قیمت:" : "Price:";
  const totalLabelText = language === "fa" ? "مجموع:" : "Total:";
  const tomanText = language === "fa" ? "تومان" : "Toman";
  const nextStepsText = language === "fa"
    ? "ما به محض آماده شدن سفارش شما، اطلاع‌رسانی خواهیم کرد. در صورت نیاز به هرگونه کمک، با ما تماس بگیرید."
    : "We will notify you as soon as your order is ready. If you need any help, please contact us.";
  const orderStatusTitle = language === "fa" ? "📦 وضعیت سفارش:" : "📦 Order Status:";
  const statusTip1 = language === "fa"
    ? "سفارش شما در حال پردازش است"
    : "Your order is being processed";
  const statusTip2 = language === "fa"
    ? "به محض آماده شدن، اطلاع‌رسانی خواهیم کرد"
    : "We will notify you as soon as it's ready";
  const statusTip3 = language === "fa"
    ? "در صورت نیاز به کمک، با ما تماس بگیرید"
    : "If you need help, please contact us";
  const automatedText = language === "fa"
    ? "این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید."
    : "This is an automated email. Please do not reply to this message.";

  return (
    <Html lang={language === "fa" ? "fa" : "en"} dir={language === "fa" ? "rtl" : "ltr"}>
      <Head>
        {/*[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]*/}
      </Head>
      <Body style={bodyStyle} dir={language === "fa" ? "rtl" : "ltr"}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerSection}>
            <Row>
              <Column align="center">
                <Text style={logoContainer}>
                  <span style={logoText}>N</span>
                </Text>
                <Heading style={headerTitle}>Nazira</Heading>
                <Text style={headerSubtitle}>{orderConfirmedText}</Text>
              </Column>
            </Row>
          </Section>

          {/* Body Content */}
          <Section style={bodySection}>
            <Text style={textStyle}>{thankYouText}</Text>

            {/* Order Number */}
            <Section style={orderNumberSection}>
              <Row>
                <Column align="center">
                  <Section style={orderNumberBox}>
                    <Text style={orderNumberText}>{orderNumber}</Text>
                  </Section>
                </Column>
              </Row>
            </Section>

            {/* Order Details */}
            <Heading style={h2}>{orderDetailsText}</Heading>
            <Section style={infoSection}>
              <Text style={infoRow}>
                <strong>{orderNumberLabel}</strong> {orderNumber}
              </Text>
              <Text style={infoRow}>
                <strong>{orderDateLabel}</strong> {orderDate}
              </Text>
              <Text style={infoRow}>
                <strong>{paymentMethodLabel}</strong> {paymentMethodDisplay}
              </Text>
            </Section>

            {/* Order Items */}
            <Heading style={h3}>{orderItemsText}</Heading>
            <Section style={itemsSection}>
              {items.map((item, index) => (
                <Section key={index} style={itemRow}>
                  <Text style={itemName}>{item.name}</Text>
                  <Text style={itemDetails}>
                    {quantityText} {item.quantity} • {priceText} {item.price} {tomanText}
                  </Text>
                </Section>
              ))}
              <Hr style={itemsDivider} />
              <Section style={totalRow}>
                <Text style={totalLabel}>{totalLabelText}</Text>
                <Text style={totalValue}>{totalFormatted}</Text>
              </Section>
            </Section>

            <Text style={textStyle}>{nextStepsText}</Text>
          </Section>

          {/* Info Box */}
          <Section style={infoBoxSection}>
            <Row>
              <Column>
                <Section style={infoBox}>
                  <Text style={infoBoxTitle}>{orderStatusTitle}</Text>
                  <Text style={infoBoxList}>
                    • {statusTip1}<br />
                    • {statusTip2}<br />
                    • {statusTip3}
                  </Text>
                </Section>
              </Column>
            </Row>
          </Section>

          {/* Divider */}
          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerSection}>
            {/* Social Links */}
            {(telegram || instagram || whatsapp) && (
              <Row>
                <Column align="center">
                  <Text style={socialLinksContainer}>
                    {telegram && (
                      <Link
                        href={`https://t.me/${telegram.replace("@", "").trim()}`}
                        style={socialLink}
                      >
                        Telegram
                      </Link>
                    )}
                    {telegram && (instagram || whatsapp) && " • "}
                    {instagram && (
                      <Link
                        href={`https://instagram.com/${instagram.replace("@", "").trim()}`}
                        style={socialLink}
                      >
                        Instagram
                      </Link>
                    )}
                    {instagram && whatsapp && " • "}
                    {whatsapp && (
                      <Link
                        href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "").trim()}`}
                        style={socialLink}
                      >
                        WhatsApp
                      </Link>
                    )}
                  </Text>
                </Column>
              </Row>
            )}

            <Text style={footerText}>
              © 2025 Nazira. All rights reserved.
            </Text>

            {(displayAddress || contactEmail) && (
              <Text style={footerText}>
                {displayAddress && <>{displayAddress}<br /></>}
                {contactEmail && (
                  <Link href={`mailto:${contactEmail}`} style={emailLink}>
                    {contactEmail}
                  </Link>
                )}
              </Text>
            )}
          </Section>
        </Container>

        {/* Unsubscribe Link */}
        <Container style={unsubscribeContainer}>
          <Text style={unsubscribeText}>{automatedText}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default RegisteredOrderConfirmationEmail;

// Styles (matching verification.tsx)
const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: "#e8e9ea",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "20px auto",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
};

const headerSection: React.CSSProperties = {
  background: "linear-gradient(135deg, #367260 0%, #6c9cb8 100%)",
  padding: "30px 20px",
  textAlign: "center",
};

const logoContainer: React.CSSProperties = {
  margin: "0 0 20px 0",
  textAlign: "center",
};

const logoText: React.CSSProperties = {
  display: "inline-block",
  width: "80px",
  height: "80px",
  backgroundColor: "#ffffff",
  borderRadius: "50%",
  lineHeight: "80px",
  fontSize: "40px",
  fontWeight: 700,
  color: "#367260",
  textAlign: "center",
};

const headerTitle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: 700,
};

const headerSubtitle: React.CSSProperties = {
  margin: "10px 0 0 0",
  color: "#ffffff",
  fontSize: "16px",
  opacity: 0.95,
};

const bodySection: React.CSSProperties = {
  padding: "40px 30px",
};

const textStyle: React.CSSProperties = {
  margin: "0 0 20px 0",
  color: "#2c3e50",
  fontSize: "16px",
  lineHeight: 1.6,
};

const orderNumberSection: React.CSSProperties = {
  padding: "0 0 30px 0",
};

const orderNumberBox: React.CSSProperties = {
  backgroundColor: "#e8e9ea",
  border: "3px dashed #6c9cb8",
  borderRadius: "12px",
  padding: "20px 40px",
  display: "inline-block",
  margin: 0,
};

const orderNumberText: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  color: "#367260",
  letterSpacing: "4px",
  fontFamily: "'Courier New', monospace",
  margin: 0,
};

const h2: React.CSSProperties = {
  margin: "30px 0 15px 0",
  color: "#2c3e50",
  fontSize: "20px",
  fontWeight: 600,
};

const h3: React.CSSProperties = {
  margin: "25px 0 15px 0",
  color: "#2c3e50",
  fontSize: "18px",
  fontWeight: 600,
};

const infoSection: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "20px",
  borderRadius: "8px",
  marginBottom: "20px",
};

const infoRow: React.CSSProperties = {
  margin: "8px 0",
  color: "#2c3e50",
  fontSize: "15px",
  lineHeight: 1.6,
};

const itemsSection: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "20px",
  borderRadius: "8px",
  marginBottom: "20px",
};

const itemRow: React.CSSProperties = {
  marginBottom: "15px",
  paddingBottom: "15px",
  borderBottom: "1px solid #e0e0e0",
};

const itemName: React.CSSProperties = {
  margin: "0 0 5px 0",
  color: "#2c3e50",
  fontSize: "16px",
  fontWeight: 600,
};

const itemDetails: React.CSSProperties = {
  margin: 0,
  color: "#666666",
  fontSize: "14px",
};

const itemsDivider: React.CSSProperties = {
  borderTop: "2px solid #6c9cb8",
  margin: "15px 0",
};

const totalRow: React.CSSProperties = {
  marginTop: "10px",
};

const totalLabel: React.CSSProperties = {
  margin: "0 0 5px 0",
  color: "#2c3e50",
  fontSize: "16px",
  fontWeight: 600,
  display: "block",
};

const totalValue: React.CSSProperties = {
  margin: 0,
  color: "#367260",
  fontSize: "24px",
  fontWeight: 700,
  display: "block",
};

const infoBoxSection: React.CSSProperties = {
  padding: "0 30px 40px 30px",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  borderLeft: "4px solid #6c9cb8",
  padding: "20px",
  borderRadius: "8px",
  margin: 0,
};

const infoBoxTitle: React.CSSProperties = {
  margin: "0 0 10px 0",
  color: "#2c3e50",
  fontSize: "14px",
  fontWeight: 600,
  display: "block",
};

const infoBoxList: React.CSSProperties = {
  margin: 0,
  color: "#666666",
  fontSize: "14px",
  lineHeight: 1.8,
  display: "block",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e8e9ea",
  margin: "0 30px",
};

const footerSection: React.CSSProperties = {
  padding: "30px",
  textAlign: "center",
  backgroundColor: "#f8f9fa",
};

const socialLinksContainer: React.CSSProperties = {
  marginBottom: "20px",
  fontSize: "14px",
  color: "#666666",
};

const socialLink: React.CSSProperties = {
  textDecoration: "none",
  fontSize: "14px",
  color: "#6c9cb8",
  fontWeight: 600,
  margin: "0 5px",
  display: "inline-block",
};

const footerText: React.CSSProperties = {
  margin: "0 0 10px 0",
  color: "#999999",
  fontSize: "12px",
};

const emailLink: React.CSSProperties = {
  color: "#6c9cb8",
  textDecoration: "none",
};

const unsubscribeContainer: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
  textAlign: "center",
};

const unsubscribeText: React.CSSProperties = {
  margin: 0,
  color: "#999999",
  fontSize: "12px",
};

