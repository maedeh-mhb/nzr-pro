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
  Button,
} from "@react-email/components";
import * as React from "react";

interface ShippingUpdateEmailProps {
  orderNumber: string;
  customerName: string;
  status: string;
  trackingNumber?: string;
  trackingLink?: string;
  estimatedDelivery?: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  addressFa?: string | null;
  email?: string | null;
  language?: "en" | "fa";
}

export const ShippingUpdateEmail = ({
  orderNumber,
  customerName,
  status,
  trackingNumber,
  trackingLink,
  estimatedDelivery,
  telegram,
  instagram,
  whatsapp,
  address,
  addressFa,
  email,
  language = "fa",
}: ShippingUpdateEmailProps) => {
  const displayAddress = language === "fa" && addressFa ? addressFa : address;

  // Status translations
  const statusMessages: Record<string, { en: string; fa: string }> = {
    shipped: {
      en: "Your order has been shipped!",
      fa: "سفارش شما ارسال شد!",
    },
    delivered: {
      en: "Your order has been delivered!",
      fa: "سفارش شما تحویل داده شد!",
    },
    out_for_delivery: {
      en: "Your order is out for delivery!",
      fa: "سفارش شما در حال تحویل است!",
    },
  };

  const statusMessage = statusMessages[status]?.[language] || 
    (language === "fa" ? "به‌روزرسانی وضعیت ارسال" : "Shipping Update");

  // Translations
  const shippingUpdateText = language === "fa" ? "به‌روزرسانی ارسال" : "Shipping Update";
  const greetingText = language === "fa" ? `سلام ${customerName}،` : `Hello ${customerName},`;
  const updateText = language === "fa"
    ? `ما یک به‌روزرسانی در مورد سفارش شماره ${orderNumber} داریم.`
    : `We have an update on your order #${orderNumber}.`;
  const orderNumberLabel = language === "fa" ? "شماره سفارش:" : "Order Number:";
  const statusLabel = language === "fa" ? "وضعیت:" : "Status:";
  const trackingNumberLabel = language === "fa" ? "شماره پیگیری:" : "Tracking Number:";
  const estimatedDeliveryLabel = language === "fa" ? "زمان تحویل تقریبی:" : "Estimated Delivery:";
  const trackButtonText = language === "fa" ? "پیگیری سفارش" : "Track Your Order";
  const thankYouText = language === "fa"
    ? "با تشکر از خرید شما!"
    : "Thank you for shopping with us!";
  const infoTitle = language === "fa" ? "📦 اطلاعات ارسال:" : "📦 Shipping Information:";
  const automatedText = language === "fa"
    ? "این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید."
    : "This is an automated email. Please do not reply to this message.";

  return (
    <Html lang={language === "fa" ? "fa" : "en"}>
      <Head>
        {/*[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, sans-serif !important;}
        </style>
        <![endif]*/}
      </Head>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerSection}>
            <Row>
              <Column align="center">
                <Text style={logoContainer}>
                  <span style={logoText}>N</span>
                </Text>
                <Heading style={headerTitle}>Nazira</Heading>
                <Text style={headerSubtitle}>{shippingUpdateText}</Text>
              </Column>
            </Row>
          </Section>

          {/* Body Content */}
          <Section style={bodySection}>
            <Heading style={h2}>{statusMessage}</Heading>
            <Text style={textStyle}>{greetingText}</Text>
            <Text style={textStyle}>{updateText}</Text>

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

            {/* Shipping Information */}
            <Section style={infoSection}>
              <Text style={infoRow}>
                <strong>{orderNumberLabel}</strong> {orderNumber}
              </Text>
              <Text style={infoRow}>
                <strong>{statusLabel}</strong> {statusMessage}
              </Text>
              {trackingNumber && (
                <Text style={infoRow}>
                  <strong>{trackingNumberLabel}</strong> {trackingNumber}
                </Text>
              )}
              {estimatedDelivery && (
                <Text style={infoRow}>
                  <strong>{estimatedDeliveryLabel}</strong> {estimatedDelivery}
                </Text>
              )}
            </Section>

            {/* Track Button */}
            {trackingLink && (
              <Section style={buttonSection}>
                <Row>
                  <Column align="center">
                    <Button href={trackingLink} style={trackButton}>
                      {trackButtonText}
                    </Button>
                  </Column>
                </Row>
              </Section>
            )}

            <Text style={textStyle}>{thankYouText}</Text>
          </Section>

          {/* Info Box */}
          <Section style={infoBoxSection}>
            <Row>
              <Column>
                <Section style={infoBox}>
                  <Text style={infoBoxTitle}>{infoTitle}</Text>
                  <Text style={infoBoxList}>
                    {trackingNumber && (
                      <>
                        {language === "fa" ? "• شماره پیگیری:" : "• Tracking Number:"} {trackingNumber}
                        <br />
                      </>
                    )}
                    {estimatedDelivery && (
                      <>
                        {language === "fa" ? "• زمان تحویل تقریبی:" : "• Estimated Delivery:"} {estimatedDelivery}
                        <br />
                      </>
                    )}
                    {language === "fa"
                      ? "• می‌توانید سفارش خود را با استفاده از شماره پیگیری بالا پیگیری کنید"
                      : "• You can track your order using the tracking number above"}
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
            
            {(displayAddress || email) && (
              <Text style={footerText}>
                {displayAddress && <>{displayAddress}<br /></>}
                {email && (
                  <Link href={`mailto:${email}`} style={emailLink}>
                    {email}
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

export default ShippingUpdateEmail;

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

const h2: React.CSSProperties = {
  margin: "0 0 20px 0",
  color: "#2c3e50",
  fontSize: "24px",
  fontWeight: 600,
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

const buttonSection: React.CSSProperties = {
  padding: "30px 0",
  textAlign: "center",
};

const trackButton: React.CSSProperties = {
  backgroundColor: "#367260",
  background: "linear-gradient(135deg, #367260 0%, #6c9cb8 100%)",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "16px 40px",
  display: "inline-block",
  boxShadow: "0 4px 12px rgba(54, 114, 96, 0.3)",
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
