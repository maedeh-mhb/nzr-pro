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

interface PasswordResetEmailProps {
  userName?: string;
  resetLink: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  addressFa?: string | null;
  email?: string | null;
  language?: "en" | "fa";
}

export const PasswordResetEmail = ({
  userName = "User",
  resetLink,
  telegram,
  instagram,
  whatsapp,
  address,
  addressFa,
  email,
  language = "fa",
}: PasswordResetEmailProps) => {
  const displayAddress = language === "fa" && addressFa ? addressFa : address;
  const resetPasswordText = language === "fa" ? "بازیابی رمز عبور" : "Reset Password";
  const greetingText = language === "fa" ? `سلام ${userName}،` : `Hello ${userName},`;
  const requestText = language === "fa"
    ? "ما درخواست شما برای بازیابی رمز عبور حساب کاربری‌تان را دریافت کردیم. برای تنظیم رمز عبور جدید، روی دکمه زیر کلیک کنید:"
    : "We received a request to reset your account password. To set a new password, please click the button below:";
  const buttonText = language === "fa" ? "بازیابی رمز عبور" : "Reset Password";
  const linkNotWorkingText = language === "fa"
    ? "اگر دکمه کار نمی‌کند، این لینک را کپی و در مرورگر خود باز کنید:"
    : "If the button doesn't work, copy and paste this link into your browser:";
  const expiryText = language === "fa"
    ? "⏰ این لینک تا 10 دقیقه معتبر است."
    : "⏰ This link is valid for 10 minutes.";
  const securityTitle = language === "fa" ? "⚠️ امنیت:" : "⚠️ Security:";
  const securityTip1 = language === "fa"
    ? "اگر شما این درخواست را ارسال نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید"
    : "If you didn't request this, please ignore this email";
  const securityTip2 = language === "fa"
    ? "لینک بازیابی فقط یک بار قابل استفاده است"
    : "The reset link can only be used once";
  const securityTip3 = language === "fa"
    ? "برای امنیت بیشتر، رمز عبور جدید خود را در جایی امن نگه دارید"
    : "For security, keep your new password in a safe place";
  const importantTipsTitle = language === "fa" ? "💡 نکات مهم:" : "💡 Important Tips:";
  const importantTip1 = language === "fa"
    ? "لینک بازیابی فقط 10 دقیقه معتبر است"
    : "The reset link is valid for 10 minutes only";
  const importantTip2 = language === "fa"
    ? "پس از استفاده، لینک دیگر کار نمی‌کند"
    : "After use, the link will no longer work";
  const importantTip3 = language === "fa"
    ? "اگر لینک منقضی شد، می‌توانید دوباره درخواست بازیابی ارسال کنید"
    : "If the link expires, you can request a new reset link";
  const helpText = language === "fa"
    ? "اگر مشکلی دارید یا سوالی دارید، لطفاً با پشتیبانی ما تماس بگیرید."
    : "If you have any issues or questions, please contact our support team.";
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
                <Text style={headerSubtitle}>{resetPasswordText}</Text>
              </Column>
            </Row>
          </Section>

          {/* Body Content */}
          <Section style={bodySection}>
            <Text style={textStyle}>{greetingText}</Text>
            <Text style={textStyle}>{requestText}</Text>
            
            {/* Reset Button */}
            <Section style={buttonSection}>
              <Row>
                <Column align="center">
                  <Button href={resetLink} style={resetButton}>
                    {buttonText}
                  </Button>
                </Column>
              </Row>
            </Section>

            {/* Reset Link (for email clients that don't support buttons) */}
            <Section style={linkSection}>
              <Row>
                <Column>
                  <Section style={linkContainer}>
                    <Text style={linkLabel}>{linkNotWorkingText}</Text>
                    <Link href={resetLink} style={linkStyle}>
                      {resetLink}
                    </Link>
                  </Section>
                </Column>
              </Row>
            </Section>

            <Text style={expiryStyle}>{expiryText}</Text>
            <Text style={textStyle}>{helpText}</Text>
          </Section>

          {/* Security Warning Box */}
          <Section style={warningBoxSection}>
            <Row>
              <Column>
                <Section style={warningBox}>
                  <Text style={warningTitle}>{securityTitle}</Text>
                  <Text style={warningList}>
                    • {securityTip1}<br />
                    • {securityTip2}<br />
                    • {securityTip3}
                  </Text>
                </Section>
              </Column>
            </Row>
          </Section>

          {/* Info Box */}
          <Section style={infoBoxSection}>
            <Row>
              <Column>
                <Section style={infoBox}>
                  <Text style={infoBoxTitle}>{importantTipsTitle}</Text>
                  <Text style={infoBoxList}>
                    • {importantTip1}<br />
                    • {importantTip2}<br />
                    • {importantTip3}
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

export default PasswordResetEmail;

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

const buttonSection: React.CSSProperties = {
  padding: "30px 0",
  textAlign: "center",
};

const resetButton: React.CSSProperties = {
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

const linkSection: React.CSSProperties = {
  padding: "0 0 30px 0",
};

const linkContainer: React.CSSProperties = {
  backgroundColor: "#f8f9fa",
  borderLeft: "4px solid #6c9cb8",
  padding: "20px",
  borderRadius: "8px",
  margin: 0,
};

const linkLabel: React.CSSProperties = {
  margin: "0 0 10px 0",
  color: "#2c3e50",
  fontSize: "14px",
  fontWeight: 600,
  display: "block",
};

const linkStyle: React.CSSProperties = {
  wordBreak: "break-all" as const,
  color: "#6c9cb8",
  textDecoration: "none",
  fontSize: "12px",
  fontFamily: "'Courier New', monospace",
  display: "block",
};

const expiryStyle: React.CSSProperties = {
  margin: "15px 0 20px 0",
  color: "#666666",
  fontSize: "14px",
  textAlign: "center",
};

const warningBoxSection: React.CSSProperties = {
  padding: "0 30px 20px 30px",
};

const warningBox: React.CSSProperties = {
  backgroundColor: "#fff3cd",
  border: "2px solid #ffc107",
  borderRadius: "8px",
  padding: "20px",
  margin: 0,
};

const warningTitle: React.CSSProperties = {
  margin: "0 0 10px 0",
  color: "#856404",
  fontSize: "16px",
  fontWeight: 600,
  display: "block",
};

const warningList: React.CSSProperties = {
  margin: 0,
  color: "#856404",
  fontSize: "14px",
  lineHeight: 1.6,
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
  lineHeight: 1.6,
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

