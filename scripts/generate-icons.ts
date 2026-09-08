import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

// Minimal from-scratch PNG encoder (no dependencies) for solid-color app icons.
// Draws a rounded-square brand-green background with a lighter circle, similar
// in spirit to the manifest's theme color, so the installed icon isn't blank.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeData))
  return Buffer.concat([len, typeData, crc])
}

function makePng(size: number, maskableSafe: boolean): Buffer {
  const bg = [22, 163, 74] // brand-600
  const fg = [240, 253, 244] // brand-50

  const raw = Buffer.alloc(size * (1 + size * 4))
  const cx = size / 2
  const cy = size / 2
  const bgRadius = maskableSafe ? size * 0.5 : size * 0.46 // maskable icons get cropped, keep content inside the safe zone
  const dotRadius = bgRadius * 0.32

  for (let y = 0; y < size; y++) {
    let offset = y * (1 + size * 4)
    raw[offset] = 0 // filter type: none
    offset += 1
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      let color = bg
      let alpha = 255
      if (!maskableSafe) {
        // rounded-square cutout for the non-maskable icon
        const outside = Math.max(Math.abs(dx) - (size / 2 - size * 0.08), 0) ** 2 + Math.max(Math.abs(dy) - (size / 2 - size * 0.08), 0) ** 2
        if (outside > (size * 0.08) ** 2) alpha = 0
      }
      if (dist < dotRadius) color = fg

      const i = offset + x * 4
      raw[i] = color[0]
      raw[i + 1] = color[1]
      raw[i + 2] = color[2]
      raw[i + 3] = alpha
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = deflateSync(raw)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const outDir = path.resolve(process.cwd(), 'public/icons')
mkdirSync(outDir, { recursive: true })

writeFileSync(path.join(outDir, 'icon-192.png'), makePng(192, false))
writeFileSync(path.join(outDir, 'icon-512.png'), makePng(512, false))
writeFileSync(path.join(outDir, 'icon-512-maskable.png'), makePng(512, true))

console.log('Icons written to', outDir)
