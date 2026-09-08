import { hashPin } from '../server/utils/auth'

const pin = process.argv[2]

if (!pin) {
  console.error('Usage: npm run hash-pin -- <pin>')
  process.exit(1)
}

console.log(hashPin(pin))
