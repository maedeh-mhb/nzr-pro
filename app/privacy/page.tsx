"use client";

import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import styles from "@/styles/pages/_contentPage.module.scss";

export default function PrivacyPage() {
  const { language } = useLanguage();

  return (
    <>
      <Navbar />
      <div className={styles.contentPage}>
        <div className={styles.container}>
          <h1 className={styles.title}>
            {language === "fa" ? "شرایط و حریم خصوصی – نازیرا" : "Privacy Policy – Nazira"}
          </h1>

          {language === "fa" ? (
            <div className={styles.content}>
              <p>آخرین بروزرسانی: مرداد ۱۴۰۵</p>
              <p>در نازیرا، حفظ حریم خصوصی و اعتماد کاربران برای ما اهمیت زیادی دارد. این صفحه توضیح میدهد که چه اطلاعاتی از کاربران جمع آوری میشود، چگونه استفاده میشود و چگونه از آن محافظت میکنیم.</p>

              <h2>۱. اطلاعاتی که جمع آوری میکنیم</h2>
              <p>هنگام استفاده از وبسایت، ثبت سفارش، ایجاد حساب کاربری یا ارتباط با ما، ممکن است اطلاعات زیر جمع آوری شود:</p>
              <ul>
                <li>نام و نام خانوادگی</li>
                <li>شماره تماس</li>
                <li>آدرس ایمیل</li>
                <li>آدرس ارسال سفارش</li>
                <li>اطلاعات مربوط به پرداخت</li>
                <li>سوابق سفارشها</li>
                <li>پیامها و درخواستهای پشتیبانی</li>
              </ul>
              <p>همچنین ممکن است برخی اطلاعات فنی به صورت خودکار جمع آوری شوند، از جمله:</p>
              <ul>
                <li>نوع مرورگر</li>
                <li>اطلاعات دستگاه</li>
                <li>آدرس IP</li>
                <li>کوکی ها و داده های آماری</li>
              </ul>

              <h2>۲. نحوه استفاده از اطلاعات</h2>
              <p>اطلاعات جمع آوری شده برای موارد زیر استفاده میشوند:</p>
              <ul>
                <li>پردازش و مدیریت سفارشها</li>
                <li>ارائه خدمات پشتیبانی</li>
                <li>بهبود کیفیت محصولات و خدمات</li>
                <li>ارسال سفارشها از طریق پست جمهوری اسلامی ایران</li>
                <li>اطلاع رسانی درباره سفارشها و بروزرسانی ها</li>
                <li>بهبود عملکرد وبسایت</li>
                <li>جلوگیری از سوءاستفاده یا فعالیتهای غیرمجاز</li>
              </ul>
              <p>نازیرا اطلاعات کاربران را به اشخاص یا شرکتهای ثالث نمی فروشد و اجاره نمی دهد.</p>

              <h2>۳. پرداختها</h2>
              <p>در حال حاضر پرداخت‌ها از طریق درگاه پرداخت آنلاین و همچنین روش کارت به کارت امکان‌پذیر است.</p>
              <p>نازیرا اطلاعات حساس بانکی کاربران را فراتر از نیازهای ضروری نگهداری نمیکند.</p>

              <h2>۴. ارسال سفارشها</h2>
              <p>در حال حاضر ارسال سفارش‌ها فقط در داخل ایران و از طریق پست ملی انجام می‌شود.</p>
              <p>پس از ثبت سفارش، آماده‌سازی و تحویل به شرکت پست معمولاً تا ۱۰ روز کاری زمان می‌برد.</p>
              <p>زمان ارسال ممکن است بسته به شرایط پستی، تعطیلات یا مقصد متفاوت باشد.</p>

              <h2>۵. سیاست عدم بازگشت وجه</h2>
              <p>به دلیل ماهیت بهداشتی و دست ساز محصولات، در حال حاضر امکان مرجوعی یا بازگشت وجه وجود ندارد؛ مگر در مواردی که قانون الزام کند.</p>
              <p>لطفاً پیش از خرید، اطلاعات محصول را با دقت مطالعه کنید.</p>

              <h2>۶. امنیت حساب کاربری</h2>
              <p>کاربران مسئول حفظ امنیت حساب کاربری و رمز عبور خود هستند.</p>
              <p>نازیرا مسئول دسترسی غیرمجاز ناشی از سهل انگاری کاربران نخواهد بود.</p>

              <h2>۷. کوکیها و ابزارهای آماری</h2>
              <p>ممکن است وبسایت برای بهبود عملکرد و تجربه کاربری از کوکیها یا ابزارهای آماری استفاده کند.</p>
              <p>کاربران میتوانند در صورت تمایل، کوکیها را از طریق تنظیمات مرورگر غیرفعال کنند.</p>

              <h2>۸. خدمات و لینکهای شخص ثالث</h2>
              <p>وبسایت ممکن است شامل لینکهایی به اینستاگرام، تلگرام، واتساپ یا سرویسهای پرداخت باشد. نازیرا مسئول سیاستهای حریم خصوصی وبسایتها و سرویسهای شخص ثالث نیست.</p>

              <h2>۹. تغییرات در سیاست حریم خصوصی</h2>
              <p>نازیرا ممکن است این سیاست را در آینده بروزرسانی کند. ادامه استفاده از وبسایت به معنای پذیرش نسخه جدید خواهد بود.</p>

              <h2>۱۰. ارتباط با ما</h2>
              <p>در صورت وجود هرگونه سؤال درباره حریم خصوصی، میتوانید از طریق ایمیل زیر با ما در ارتباط باشید:</p>
              <p>ایمیل: <a href="mailto:nazira.organicsoaps@gmail.com">nazira.organicsoaps@gmail.com</a></p>
              <p>از اعتماد شما به نازیرا سپاسگزاریم.</p>
            </div>
          ) : (
            <div className={styles.content}>
              <p>Last Updated: August 2026</p>
              <p>Welcome to Nazira. Your privacy and trust are important to us. This Privacy Policy explains how Nazira collects, uses, and protects your personal information when you use our website and services.</p>

              <h2>1. Information We Collect</h2>
              <p>When you use our website, place an order, create an account, or contact us, we may collect information including:</p>
              <ul>
                <li>Full name</li>
                <li>Phone number</li>
                <li>Email address</li>
                <li>Shipping address</li>
                <li>Payment-related information</li>
                <li>Order history</li>
                <li>Messages or support requests</li>
              </ul>
              <p>We may also automatically collect limited technical information such as:</p>
              <ul>
                <li>Browser type</li>
                <li>Device information</li>
                <li>IP address</li>
                <li>Cookies and analytics data</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Process and manage orders</li>
                <li>Provide customer support</li>
                <li>Improve our products and services</li>
                <li>Deliver products through Iran National Post</li>
                <li>Communicate regarding orders and updates</li>
                <li>Improve website performance and user experience</li>
                <li>Prevent fraud or misuse</li>
              </ul>
              <p>Nazira does not sell or rent customer information to third parties.</p>

              <h2>3. Payments</h2>
              <p>Currently, payments can be completed through our online payment gateway as well as card-to-card transfer methods.</p>
              <p>Nazira does not intentionally store sensitive banking information beyond what is necessary to verify transactions.</p>

              <h2>4. Shipping</h2>
              <p>Orders are currently shipped only within Iran through the national postal service.</p>
              <p>After an order is placed, preparation and handover to the shipping company typically take up to 10 working days.</p>
              <p>Shipping times may vary depending on destination, holidays, weather conditions, or postal delays.</p>

              <h2>5. No Refund Policy</h2>
              <p>Due to the hygienic and handmade nature of our products, all sales are currently final and refunds or returns are not accepted unless required by applicable law.</p>
              <p>Customers are encouraged to carefully review product details before purchasing.</p>

              <h2>6. Account Security</h2>
              <p>Users are responsible for maintaining the confidentiality of their account information and passwords.</p>
              <p>Nazira is not responsible for unauthorized access caused by user negligence.</p>

              <h2>7. Cookies & Analytics</h2>
              <p>Our website may use cookies or analytics tools to improve functionality, user experience, and website performance.</p>
              <p>Users may disable cookies through their browser settings if preferred.</p>

              <h2>8. Third-Party Services</h2>
              <p>Our website may contain links to external platforms such as Instagram, Telegram, WhatsApp, or payment providers. Nazira is not responsible for the privacy practices of third-party websites or services.</p>

              <h2>9. Changes to This Policy</h2>
              <p>Nazira may update this Privacy Policy from time to time. Continued use of the website after updates means you accept the revised policy.</p>

              <h2>10. Contact Us</h2>
              <p>If you have questions regarding this Privacy Policy, please contact us:</p>
              <p>Email: <a href="mailto:nazira.organicsoaps@gmail.com">nazira.organicsoaps@gmail.com</a></p>
              <p>Thank you for trusting Nazira.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}
