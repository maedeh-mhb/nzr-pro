"use client";

import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import styles from "@/styles/pages/_contentPage.module.scss";

export default function TermsPage() {
  const { language } = useLanguage();

  return (
    <>
      <Navbar />
      <div className={styles.contentPage}>
        <div className={styles.container}>
          <h1 className={styles.title}>
            {language === "fa" ? "شرایط و قوانین استفاده از خدمات نازیرا" : "Terms of Service – Nazira"}
          </h1>
          
          {language === "fa" ? (
            <div className={styles.content}>
              <p>آخرین بروزرسانی: مرداد ۱۴۰۵</p>
              
              <p>به وبسایت نازیرا خوش آمدید. استفاده از این وبسایت و خدمات آن به منزله مطالعه و پذیرش شرایط و قوانین زیر است. لطفاً پیش از ثبت سفارش یا استفاده از خدمات، این شرایط را با دقت مطالعه کنید.</p>

              <h2>۱. پذیرش شرایط</h2>
              <p>با ورود به وبسایت، ایجاد حساب کاربری، ثبت سفارش یا استفاده از هر یک از خدمات نازیرا، شما موافقت خود را با این شرایط و قوانین اعلام میکنید.</p>
              <p>در صورتی که با هر بخش از این شرایط موافق نیستید، لطفاً از استفاده از وبسایت خودداری نمایید.</p>

              <h2>۲. خدمات نازیرا</h2>
              <p>نازیرا در زمینه تولید و عرضه محصولات دستساز، طبیعی، ارگانیک و مرتبط با سلامت، مراقبت پوست و مو فعالیت میکند.</p>
              <p>تمامی محصولات با هدف ارتقای کیفیت زندگی و مراقبت طبیعی طراحی و تولید میشوند.</p>

              <h2>۳. اطلاعات محصولات</h2>
              <p>ما تلاش میکنیم اطلاعات محصولات، تصاویر، ترکیبات و توضیحات را با بیشترین دقت ممکن ارائه دهیم. با این حال:</p>
              <ul>
                <li>محصولات دستساز ممکن است از نظر رنگ، بافت یا ظاهر تفاوتهای جزئی داشته باشند.</li>
                <li>نتایج استفاده از محصولات در افراد مختلف ممکن است متفاوت باشد.</li>
                <li>تصاویر محصولات صرفاً جهت معرفی بوده و ممکن است با محصول دریافتی تفاوتهای جزئی داشته باشند.</li>
              </ul>

              <h2>۴. ثبت سفارش و پرداخت</h2>
              <p>ثبت سفارش به منزله درخواست خرید محصول است و پس از تأیید پرداخت، سفارش نهایی خواهد شد.</p>
              <p>در حال حاضر پرداخت‌ها از طریق درگاه پرداخت آنلاین و همچنین روش کارت به کارت امکان‌پذیر است.</p>
              <p>نازیرا حق رد یا لغو سفارشهای مشکوک، ناقص یا مغایر با قوانین را برای خود محفوظ می دارد.</p>

              <h2>۵. ارسال سفارش</h2>
              <p>ارسال سفارش‌ها در حال حاضر فقط در داخل ایران و از طریق پست جمهوری اسلامی ایران انجام می‌شود.</p>
              <p>پس از ثبت سفارش، آماده‌سازی و تحویل به شرکت پست معمولاً تا ۱۰ روز کاری زمان می‌برد.</p>
              <p>زمان‌های اعلام شده برای ارسال تقریبی هستند و ممکن است به دلایل خارج از کنترل نازیرا تغییر کنند.</p>
              <p>نازیرا مسئول تأخیرهای ناشی از خدمات پستی، شرایط جوی، تعطیلات یا مواردی که خارج از کنترل ما باشد، نیست.</p>

              <h2>۶. سیاست مرجوعی و بازگشت وجه</h2>
              <p>با توجه به ماهیت بهداشتی، مراقبتی و دستساز محصولات، امکان مرجوعی یا بازگشت وجه برای سفارشها وجود ندارد؛ مگر در مواردی که قوانین جاری کشور الزام کرده باشند.</p>
              <p>لطفاً پیش از خرید، اطلاعات محصول را با دقت مطالعه کنید.</p>

              <h2>۷. حساب کاربری</h2>
              <p>کاربران مسئول حفظ محرمانگی اطلاعات حساب کاربری و رمز عبور خود هستند.</p>
              <p>تمامی فعالیتهای انجام شده از طریق حساب کاربری، بر عهده صاحب حساب خواهد بود.</p>

              <h2>۸. مالکیت فکری</h2>
              <p>تمامی محتوای موجود در وبسایت از جمله:</p>
              <ul>
                <li>نام و برند نازیرا</li>
                <li>لوگوها</li>
                <li>تصاویر محصولات</li>
                <li>طراحی سایت</li>
                <li>متون و محتوا</li>
                <li>گرافیکها و عناصر بصری</li>
              </ul>
              <p>متعلق به نازیرا بوده و هرگونه کپیبرداری، انتشار، بازتولید یا استفاده تجاری بدون مجوز کتبی ممنوع است.</p>

              <h2>۹. محدودیت مسئولیت</h2>
              <p>نازیرا در قبال موارد زیر مسئولیتی نخواهد داشت:</p>
              <ul>
                <li>استفاده نادرست از محصولات</li>
                <li>حساسیتها یا واکنشهای فردی به مواد طبیعی</li>
                <li>تأخیرهای ناشی از شرکتهای حمل و نقل</li>
                <li>اختلالات موقت وبسایت یا مشکلات فنی خارج از کنترل</li>
                <li>خسارات غیرمستقیم ناشی از استفاده از محصولات یا خدمات</li>
              </ul>
              <p>کاربران مسئول تعیین این موضوع هستند که آیا محصولی مناسب نیازهای شخصی خود است یا خیر.</p>

              <h2>۱۰. تغییر شرایط و قوانین</h2>
              <p>نازیرا این حق را دارد که در هر زمان، شرایط و قوانین را بروزرسانی یا اصلاح کند.</p>
              <p>نسخه جدید از زمان انتشار در وبسایت معتبر خواهد بود و ادامه استفاده از وبسایت به منزله پذیرش تغییرات خواهد بود.</p>

              <h2>۱۱. راههای ارتباطی</h2>
              <p>در صورت وجود هرگونه سؤال، پیشنهاد یا درخواست پشتیبانی، میتوانید از طریق اطلاعات زیر با ما در ارتباط باشید:</p>
              <p>ایمیل: <a href="mailto:nazira.organicsoaps@gmail.com">nazira.organicsoaps@gmail.com</a></p>
              <p>همچنین میتوانید از طریق صفحات رسمی نازیرا در اینستاگرام، تلگرام و واتساپ با ما در تماس باشید.</p>
              <p>از اعتماد شما به نازیرا سپاسگزاریم.</p>
            </div>
          ) : (
            <div className={styles.content}>
              <p>Last Updated: August 2026</p>
              
              <p>Welcome to Nazira. By accessing or using our website, creating an account, placing an order, or using any of our services, you agree to these Terms of Service. Please read them carefully before using the website.</p>

              <h2>1. Acceptance of Terms</h2>
              <p>By accessing or using Nazira`&apos;`s website and services, you acknowledge that you have read, understood, and agreed to these Terms of Service.</p>
              <p>If you do not agree with any part of these terms, please refrain from using the website.</p>

              <h2>2. About Nazira</h2>
              <p>Nazira specializes in handmade, natural, organic, and wellness-related products, including products for personal care, skin care, hair care, and healthy living.</p>
              <p>Our products are created with a commitment to quality, authenticity, and respect for health and nature.</p>

              <h2>3. Product Information</h2>
              <p>We strive to provide accurate descriptions, images, ingredient lists, and product information. However:</p>
              <ul>
                <li>Handmade products may vary slightly in appearance, texture, color, or packaging.</li>
                <li>Results may differ from person to person.</li>
                <li>Product images are provided for illustration purposes and may differ slightly from the delivered product.</li>
              </ul>

              <h2>4. Orders and Payments</h2>
              <p>Placing an order constitutes a request to purchase products from Nazira.</p>
              <p>Orders become final after payment verification.</p>
              <p>Currently, payments can be completed through our online payment gateway as well as card-to-card bank transfers.</p>
              <p>Nazira reserves the right to reject or cancel suspicious, incomplete, fraudulent, or unauthorized orders.</p>

              <h2>5. Shipping Policy</h2>
              <p>Products are currently shipped only within Iran through Iran National Post.</p>
              <p>After an order is placed, preparation and handover to the shipping company typically take up to 10 working days.</p>
              <p>Estimated delivery times are provided for convenience and are not guaranteed.</p>
              <p>Nazira is not responsible for delays caused by postal services, weather conditions, holidays, or circumstances beyond our control.</p>

              <h2>6. Return and Refund Policy</h2>
              <p>Due to the hygienic, personal-care, and handmade nature of our products, returns, exchanges, and refunds are generally not accepted unless required by applicable law.</p>
              <p>Customers are encouraged to carefully review product information before placing an order.</p>

              <h2>7. User Accounts</h2>
              <p>Users are responsible for maintaining the confidentiality of their account credentials and passwords.</p>
              <p>Any activity conducted through a user`&apos;`s account shall be considered the responsibility of the account holder.</p>

              <h2>8. Intellectual Property</h2>
              <p>All content available on the website, including but not limited to:</p>
              <ul>
                <li>The Nazira name and brand</li>
                <li>Logos</li>
                <li>Product images</li>
                <li>Website design</li>
                <li>Written content</li>
                <li>Graphics and visual elements</li>
              </ul>
              <p>is the property of Nazira and may not be copied, reproduced, distributed, modified, or used commercially without prior written permission.</p>

              <h2>9. Limitation of Liability</h2>
              <p>Nazira shall not be liable for:</p>
              <ul>
                <li>Improper use of products</li>
                <li>Allergic reactions or sensitivities to natural ingredients</li>
                <li>Delays caused by shipping providers</li>
                <li>Temporary website interruptions</li>
                <li>Indirect or consequential damages resulting from the use of products or services</li>
              </ul>
              <p>Users are responsible for determining whether a product is suitable for their personal needs.</p>

              <h2>10. Changes to Terms</h2>
              <p>Nazira reserves the right to modify or update these Terms of Service at any time.</p>
              <p>Updated versions become effective immediately upon publication on the website.</p>
              <p>Continued use of the website constitutes acceptance of the revised terms.</p>

              <h2>11. Contact Information</h2>
              <p>For questions regarding these Terms of Service, please contact us:</p>
              <p>Email: <a href="mailto:nazira.organicsoaps@gmail.com">nazira.organicsoaps@gmail.com</a></p>
              <p>You may also contact us through Nazira`&apos;`s official Instagram, Telegram, and WhatsApp channels.</p>
              <p>Thank you for choosing Nazira.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}
