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

interface VerificationEmailProps {
  name?: string;
  verificationCode: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  addressFa?: string | null;
  email?: string | null;
  language?: "en" | "fa";
}

export const VerificationEmail = ({
  name = "User",
  verificationCode,
  telegram,
  instagram,
  whatsapp,
  address,
  addressFa,
  email,
  language = "en",
}: VerificationEmailProps) => {
  const displayAddress = language === "fa" && addressFa ? addressFa : address;
  const welcomeText = language === "fa" ? "به Nazira خوش آمدید!" : "Welcome to Nazira!";
  const thankYouText = language === "fa" 
    ? "از ثبت نام شما متشکریم. برای تکمیل ثبت نام و شروع خرید، لطفاً آدرس ایمیل خود را تأیید کنید."
    : "Thank you for signing up. To complete your registration and start shopping with us, please verify your email address.";
  const codeText = language === "fa" 
    ? "کد تأیید شما:" 
    : "Your verification code is:";
  const instructionsText = language === "fa"
    ? "این کد را در صفحه تأیید وارد کنید تا حساب کاربری شما فعال شود. این کد در 10 دقیقه منقضی می‌شود."
    : "Enter this code on the verification page to activate your account. This code will expire in 10 minutes.";
  const ignoreText = language === "fa"
    ? "اگر شما حساب کاربری در Nazira ایجاد نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید."
    : "If you didn't create an account with Nazira, you can safely ignore this email.";
  const securityTitle = language === "fa" ? "🔒 نکات امنیتی:" : "🔒 Security Tips:";
  const securityTip1 = language === "fa"
    ? "هرگز کد تأیید خود را با کسی به اشتراک نگذارید"
    : "Never share your verification code with anyone";
  const securityTip2 = language === "fa"
    ? "Nazira هرگز از طریق ایمیل رمز عبور شما را نمی‌پرسد"
    : "Nazira will never ask for your password via email";
  const securityTip3 = language === "fa"
    ? "این کد برای امنیت شما در 10 دقیقه منقضی می‌شود"
    : "This code expires in 10 minutes for your security";
  const automatedText = language === "fa"
    ? "این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید."
    : "This is an automated email. Please do not reply to this message.";
  const verifyEmailText = language === "fa" ? "تأیید آدرس ایمیل" : "Verify Your Email Address";

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
                <Text style={headerSubtitle}>{verifyEmailText}</Text>
              </Column>
            </Row>
          </Section>

          {/* Body Content */}
          <Section style={bodySection}>
            <Heading style={h2}>{welcomeText}</Heading>
            <Text style={textStyle}>{thankYouText}</Text>
            <Text style={textStyle}>{codeText}</Text>
            
            {/* Verification Code */}
            <Section style={codeSection}>
              <Row>
                <Column align="center">
                  <Text style={codeBox}>
                    <span style={codeTextStyle}>{verificationCode}</span>
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text style={textStyle}>{instructionsText}</Text>
            <Text style={textStyle}>{ignoreText}</Text>
          </Section>

          {/* Info Box */}
          <Section style={infoBoxSection}>
            <Row>
              <Column>
                <Text style={infoBox}>
                  <Text style={infoBoxTitle}>{securityTitle}</Text>
                  <Text style={infoBoxList}>
                    • {securityTip1}<br />
                    • {securityTip2}<br />
                    • {securityTip3}
                  </Text>
                </Text>
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

export default VerificationEmail;

// Styles
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

const codeSection: React.CSSProperties = {
  padding: "0 0 30px 0",
};

const codeBox: React.CSSProperties = {
  backgroundColor: "#e8e9ea",
  border: "3px dashed #6c9cb8",
  borderRadius: "12px",
  padding: "20px 40px",
  display: "inline-block",
  margin: 0,
};

const codeTextStyle: React.CSSProperties = {
  fontSize: "48px",
  fontWeight: 700,
  color: "#367260",
  letterSpacing: "8px",
  fontFamily: "'Courier New', monospace",
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
