const fs = require('fs');
const path = require('path');
const PdfPrinter = require('../node_modules/pdfmake/src/printer').default;
const fonts = {
  Vazirmatn: {
    normal: path.join(process.cwd(), 'node_modules', '@fontsource', 'vazirmatn', 'files', 'vazirmatn-arabic-400-normal.woff'),
    bold: path.join(process.cwd(), 'node_modules', '@fontsource', 'vazirmatn', 'files', 'vazirmatn-arabic-700-normal.woff'),
    italics: path.join(process.cwd(), 'node_modules', '@fontsource', 'vazirmatn', 'files', 'vazirmatn-arabic-400-normal.woff'),
    bolditalics: path.join(process.cwd(), 'node_modules', '@fontsource', 'vazirmatn', 'files', 'vazirmatn-arabic-700-normal.woff'),
  }
};
const urlResolver = { resolve: (url, headers) => url, resolved: async () => {} };
const docDefinition = {
  content: [
    { text: 'سلام دنیا', font: 'Vazirmatn', alignment: 'right' },
    { text: 'Order Number: 123456', font: 'Vazirmatn' }
  ],
  defaultStyle: { font: 'Vazirmatn' }
};
const printer = new PdfPrinter(fonts, null, urlResolver, () => true);

(async () => {
  try {
    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', c => chunks.push(c));
    pdfDoc.on('end', () => {
      fs.writeFileSync('scripts/test-rtl-output.pdf', Buffer.concat(chunks));
      console.log('done');
    });
    pdfDoc.on('error', err => { console.error('ERR', err); process.exit(1); });
    pdfDoc.end();
  } catch (err) {
    console.error('ERR', err);
    process.exit(1);
  }
})();
