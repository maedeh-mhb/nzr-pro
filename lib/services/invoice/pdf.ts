/**
 * Invoice PDF generation using pdfmake (pure JS, no browser)
 */

import path from "path";
import { getInvoiceData } from "./data";
import { formatPrice } from "@/lib/utils/formatPrice";
import moment from "moment-jalaali";

// pdfmake exposes its printer constructor via the default export in CommonJS environments
// @ts-ignore
const PdfPrinter = require('pdfmake/src/Printer').default || require('pdfmake/src/Printer');

const fonts = {
  Vazirmatn: {
    normal: path.join(process.cwd(), "node_modules", "@fontsource", "vazirmatn", "files", "vazirmatn-arabic-400-normal.woff"),
    bold: path.join(process.cwd(), "node_modules", "@fontsource", "vazirmatn", "files", "vazirmatn-arabic-700-normal.woff"),
    italics: path.join(process.cwd(), "node_modules", "@fontsource", "vazirmatn", "files", "vazirmatn-arabic-400-normal.woff"),
    bolditalics: path.join(process.cwd(), "node_modules", "@fontsource", "vazirmatn", "files", "vazirmatn-arabic-700-normal.woff"),
  },
};

const urlResolver = {
  resolve: (_url: string, _headers?: Record<string, string>) => {
    return _url;
  },
  resolved: async () => {},
};

export async function generateInvoicePDF(orderId: string): Promise<Buffer | null> {
  try {
    const invoiceData = await getInvoiceData(orderId);
    if (!invoiceData) {
      return null;
    }

    const jDate = moment(invoiceData.order.createdAt);
    const orderDate = jDate.format("jYYYY/jMM/jDD");

    const paymentMethodMap: Record<string, string> = {
      card_to_card: "کارت به کارت",
      online_payment: "پرداخت آنلاین",
      pay_after_delivery: "پرداخت در محل",
      paypal: "پی‌پال",
    };
    const shippingMethodMap: Record<string, string> = {
      iranian_post: "پست پیشتاز",
      courier: "پیک",
    };

    const paymentMethod = paymentMethodMap[invoiceData.order.paymentMethod || ""] || invoiceData.order.paymentMethod || "-";
    const shippingMethod = shippingMethodMap[invoiceData.order.shippingMethod || ""] || invoiceData.order.shippingMethod || "-";

    const subtotal = invoiceData.orderItems.reduce((sum, item) => {
      return sum + parseFloat(item.price.toString()) * item.quantity;
    }, 0);
    const discount = invoiceData.order.discountAmount ? parseFloat(invoiceData.order.discountAmount.toString()) : 0;
    const total = parseFloat(invoiceData.order.total.toString());

    const printer = new PdfPrinter(fonts, null, urlResolver, () => true);

    const ltrText = (text: string) => ({ text, alignment: 'left', rtl: false });
    const rtlText = (text: string) => ({ text, alignment: 'right', rtl: true });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      direction: 'rtl',
      content: [
        // Header
        {
          columns: [
            {
              width: '60%',
              stack: [
                { text: invoiceData.companyName || 'Nazira', style: 'companyName', alignment: 'right' },
                { text: invoiceData.companyAddress || '-', style: 'companyDetails', alignment: 'right', margin: [0, 5, 0, 0] },
                { text: invoiceData.companyPhone ? `تلفن: ${invoiceData.companyPhone}` : '-', style: 'companyDetails', alignment: 'right' },
                { text: invoiceData.companyEmail ? `ایمیل: ${invoiceData.companyEmail}` : '-', style: 'companyDetails', alignment: 'right' },
              ]
            },
            {
              width: '40%',
              stack: [
                { text: 'فاکتور فروش', style: 'invoiceTitle', alignment: 'left' },
                { ...ltrText(`شماره فاکتور: ${invoiceData.order.orderNumber || '-'}`), margin: [0, 10, 0, 0] },
                { ...ltrText(`شماره سفارش: ${invoiceData.order.orderNumber || '-'}`), margin: [0, 5, 0, 20] },
              ],
              alignment: 'left'
            }
          ]
        },
        // Customer Info
        {
          text: 'اطلاعات مشتری',
          style: 'sectionHeader',
          margin: [0, 10, 0, 5]
        },
        {
          table: {
            body: [
              [{ text: 'نام:' }, { ...rtlText(invoiceData.customerName || '-') }],
              [{ text: 'ایمیل:' }, { ...ltrText(invoiceData.customerEmail || '-') }],
              [{ text: 'تلفن:' }, { ...ltrText(invoiceData.customerPhone || '-') }],
              [{ text: 'آدرس:' }, { ...rtlText(invoiceData.customerAddress || '-') }],
            ]
          },
          layout: 'noBorders'
        },
        // Order Info
        {
          text: 'اطلاعات سفارش',
          style: 'sectionHeader',
          margin: [0, 20, 0, 5]
        },
        {
          table: {
            body: [
              [{ text: 'تاریخ سفارش:' }, { ...ltrText(orderDate) }],
              [{ text: 'روش پرداخت:' }, { ...rtlText(paymentMethod) }],
              [{ text: 'روش ارسال:' }, { ...rtlText(shippingMethod) }],
            ]
          },
          layout: 'noBorders'
        },
        // Items Table
        {
          text: 'محصولات',
          style: 'sectionHeader',
          margin: [0, 20, 0, 5]
        },
        {
          table: {
            headerRows: 1,
            widths: ['5%', '50%', '15%', '15%', '15%'],
            body: [
              [
                { text: 'ردیف', style: 'tableHeader' },
                { text: 'نام محصول', style: 'tableHeader' },
                { text: 'تعداد', style: 'tableHeader' },
                { text: 'قیمت واحد', style: 'tableHeader' },
                { text: 'جمع', style: 'tableHeader' },
              ],
              ...invoiceData.orderItems.map((item, index) => [
                { text: (index + 1).toString(), alignment: 'left', rtl: false },
                { text: item.productNameFa || item.productName || '-', alignment: 'right', rtl: true },
                { text: item.quantity.toString(), alignment: 'left', rtl: false },
                { text: formatPrice(parseFloat(item.price.toString()), 'fa'), alignment: 'left', rtl: false },
                { text: formatPrice(parseFloat(item.price.toString()) * item.quantity, 'fa'), alignment: 'left', rtl: false },
              ])
            ]
          },
          layout: 'lightHorizontalLines'
        },
        // Totals
        {
          table: {
            widths: ['85%', '15%'],
            body: [
              [
                { text: 'جمع کل:', alignment: 'right', rtl: true },
                { text: formatPrice(subtotal, 'fa'), alignment: 'left', rtl: false }
              ],
              ...(discount > 0
                ? [[
                    { text: 'تخفیف:', alignment: 'right', rtl: true },
                    { text: `-${formatPrice(discount, 'fa')}`, alignment: 'left', rtl: false }
                  ]]
                : []),
              [
                { text: 'مبلغ قابل پرداخت:', bold: true, alignment: 'right', rtl: true },
                { text: formatPrice(total, 'fa'), bold: true, alignment: 'left', rtl: false }
              ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 20, 0, 0]
        },
        // Footer
        {
          text: 'با تشکر از خرید شما',
          style: 'footer',
          margin: [0, 50, 0, 0],
          alignment: 'center'
        }
      ],
      styles: {
        companyName: {
          fontSize: 20,
          bold: true,
          color: '#6c9cb8'
        },
        companyDetails: {
          fontSize: 10,
          color: '#666',
          lineHeight: 1.4
        },
        invoiceTitle: {
          fontSize: 18,
          bold: true,
          color: '#6c9cb8'
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: '#6c9cb8'
        },
        tableHeader: {
          bold: true,
          color: '#333',
          fillColor: '#f0f7fb'
        },
        footer: {
          fontSize: 10,
          color: '#999'
        }
      },
      defaultStyle: {
        font: 'Vazirmatn',
        fontSize: 10,
        alignment: 'right',
        direction: 'rtl'
      }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return null;
  }
}