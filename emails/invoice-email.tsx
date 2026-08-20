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

interface InvoiceEmailProps {
  orderNumber: string;
  customerName: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  contactAddress?: string | null;
  contactAddressFa?: string | null;
  contactEmail?: string | null;
  language?: "en" | "fa";
}

export const InvoiceEmail = ({
  orderNumber,
  customerName,
  telegram,
  instagram,
  whatsapp,
  contactAddress,
  contactAddressFa,
  contactEmail,
  language = "fa",
}: InvoiceEmailProps) => {
  // Example text variables (should be replaced with actual content/logic)
  const invoiceTitle = language === "fa" ? "فاکتور خرید شما" : "Your Purchase Invoice";
  const thankYouText = language === "fa" ? `با تشکر از خرید شما، ${customerName}!` : `Thank you for your purchase, ${customerName}!`;
  const invoiceInfoTitle = language === "fa" ? "اطلاعات فاکتور" : "Invoice Information";
  const invoiceInfoText = language === "fa" ? "جزئیات سفارش شما در زیر آمده است." : "Your order details are below.";
  const helpText = language === "fa" ? "در صورت نیاز به کمک، با پشتیبانی تماس بگیرید." : "If you need help, contact support.";
  const displayAddress = language === "fa" ? contactAddressFa : contactAddress;
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
                <Text style={headerSubtitle}>{invoiceTitle}</Text>
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

            {/* Invoice Info Box */}
            <Section style={infoBoxSection}>
              <Section style={infoBox}>
                <Text style={infoBoxTitle}>{invoiceInfoTitle}</Text>
                <Text style={infoBoxText}>{invoiceInfoText}</Text>
              </Section>
            </Section>

            <Text style={textStyle}>{helpText}</Text>
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

export default InvoiceEmail;

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
  display: "inline-block",
  width: "60px",
  height: "60px",
  backgroundColor: "#ffffff",
  borderRadius: "50%",
  textAlign: "center",
  lineHeight: "60px",
  marginBottom: "10px",
};

const logoText: React.CSSProperties = {
  color: "#367260",
  fontSize: "32px",
  fontWeight: 700,
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

const infoBoxSection: React.CSSProperties = {
  padding: "0 0 40px 0",
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
  fontSize: "16px",
  fontWeight: 600,
  display: "block",
};

const infoBoxText: React.CSSProperties = {
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

