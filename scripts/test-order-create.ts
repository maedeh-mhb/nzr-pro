import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const base = 'http://localhost:3001';
const productId = 'qfi3uwlvleya8d81lx3zd62x';
const body = {
  csrfToken: '',
  items: [{ productId, quantity: 1 }],
  total: '300000.00',
  paymentMethod: 'card_to_card',
  guestName: 'Guest User',
  guestEmail: 'guest@example.com',
  guestPhone: '09123456789',
  provinceId: 1,
  cityId: 1,
  address: 'Test Address',
  postalCode: '1234567890',
};

async function main() {
  const csrfRes = await fetch(`${base}/api/csrf-token`);
  const csrfData = await csrfRes.json();
  const setCookie = csrfRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No cookie received from CSRF endpoint');
  }
  body.csrfToken = csrfData.csrfToken;
  console.log('CSRF token:', csrfData.csrfToken);
  console.log('Set-Cookie:', setCookie);

  const orderRes = await fetch(`${base}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: setCookie,
    },
    body: JSON.stringify(body),
  });

  const result = await orderRes.text();
  console.log('status', orderRes.status, 'ok', orderRes.ok);
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
