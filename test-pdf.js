// test-pdf.js
const PdfPrinter = require('pdfmake/src/printer');

const fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
  }
};

const printer = new PdfPrinter(fonts);

const docDefinition = {
  content: [
    { text: 'Test Invoice', style: 'header' },
    { text: 'This is a test PDF', margin: [0, 20, 0, 0] },
  ],
  styles: {
    header: { fontSize: 18, bold: true }
  }
};

const pdfDoc = printer.createPdfKitDocument(docDefinition);
const chunks = [];

pdfDoc.on('data', (chunk) => chunks.push(chunk));
pdfDoc.on('end', () => {
  const buffer = Buffer.concat(chunks);
  require('fs').writeFileSync('test-output.pdf', buffer);
  console.log('PDF created successfully!');
});
pdfDoc.on('error', (err) => console.error('Error:', err));
pdfDoc.end();