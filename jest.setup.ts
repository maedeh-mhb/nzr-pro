import '@testing-library/jest-dom'

const { TextEncoder, TextDecoder } = require('util')

if (typeof globalThis.TextEncoder === 'undefined') {
  ;(globalThis as any).TextEncoder = TextEncoder
}

if (typeof globalThis.TextDecoder === 'undefined') {
  ;(globalThis as any).TextDecoder = TextDecoder
}
