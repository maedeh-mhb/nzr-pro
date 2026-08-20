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

interface CartFollowupEmailProps {
  name?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  total?: string;
  checkoutLink?: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  addressFa?: string | null;
  email?: string | null;
  language?: "en" | "fa";
}

export const CartFollowupEmail = ({
  name = "User",
  items = [],
  total = "0",
  checkoutLink = "https://example.com/checkout",
  telegram,
  instagram,
  whatsapp,
  address,
  addressFa,
  email,
  language = "fa",
}: CartFollowupEmailProps) => {
  const displayAddress = language === "fa" && addressFa ? addressFa : address;

  // Format total
  const totalFormatted = language === "fa"
    ? `${parseFloat(total).toLocaleString("fa-IR")} تومان`
    : `${parseFloat(total).toLocaleString()} Toman`;

  // Translations
  const cartReminderText = language === "fa" ? "یادآوری سبد خرید" : "Cart Reminder";
  const headingText = language === "fa"
    ? "شما آیتم‌هایی در سبد خرید دارید!"
    : "You have items waiting!";
  const greetingText = language === "fa" ? `سلام ${name}،` : `Hello ${name},`;
  const reminderText = language === "fa"
    ? "ما متوجه شدیم که شما آیتم‌هایی در سبد خرید خود دارید. لطفاً خرید خود را تکمیل کنید!"
    : "We noticed you have items in your cart. Complete your purchase now!";
  const cartItemsText = language === "fa" ? "آیتم‌های سبد خرید شما:" : "Your Cart Items:";
  const quantityText = language === "fa" ? "تعداد:" : "Quantity:";
  const priceText = language === "fa" ? "قیمت:" : "Price:";
  const totalLabel = language === "fa" ? "مجموع:" : "Total:";
  const tomanText = language === "fa" ? "تومان" : "Toman";
  const checkoutButtonText = language === "fa" ? "تکمیل خرید" : "Complete Purchase";
  const footerNoteText = language === "fa"
    ? "این ایمیل به این دلیل ارسال شد که شما آیتم‌هایی در سبد خرید خود دارید. اگر دیگر نمی‌خواهید این یادآوری‌ها را دریافت کنید، می‌توانید لغو اشتراک کنید."
    : "This email was sent because you have items in your cart. If you no longer wish to receive these reminders, you can unsubscribe.";
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
                <Text style={headerSubtitle}>{cartReminderText}</Text>
              </Column>
            </Row>
          </Section>

          {/* Body Content */}
          <Section style={bodySection}>
            <Heading style={h2}>{headingText}</Heading>
            <Text style={textStyle}>{greetingText}</Text>
            <Text style={textStyle}>{reminderText}</Text>

            {/* Cart Items */}
            {items.length > 0 && (
              <>
                <Heading style={h3}>{cartItemsText}</Heading>
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
                    <Text style={totalLabelStyle}>{totalLabel}</Text>
                    <Text style={totalValue}>{totalFormatted}</Text>
                  </Section>
                </Section>
              </>
            )}

            {/* Checkout Button */}
            <Section style={buttonSection}>
              <Row>
                <Column align="center">
                  <Button href={checkoutLink} style={checkoutButton}>
                    {checkoutButtonText}
                  </Button>
                </Column>
              </Row>
            </Section>

            <Text style={footerNoteStyle}>{footerNoteText}</Text>
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

export default CartFollowupEmail;

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

const h3: React.CSSProperties = {
  margin: "25px 0 15px 0",
  color: "#2c3e50",
  fontSize: "18px",
  fontWeight: 600,
};

const textStyle: React.CSSProperties = {
  margin: "0 0 20px 0",
  color: "#2c3e50",
  fontSize: "16px",
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

const totalLabelStyle: React.CSSProperties = {
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

const buttonSection: React.CSSProperties = {
  padding: "30px 0",
  textAlign: "center",
};

const checkoutButton: React.CSSProperties = {
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

const footerNoteStyle: React.CSSProperties = {
  margin: "20px 0 0 0",
  color: "#666666",
  fontSize: "12px",
  lineHeight: 1.6,
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
