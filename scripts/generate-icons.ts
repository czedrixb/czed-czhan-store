import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'

// Single source of truth for every installed/browser icon: rasterize the
// Tindahan storefront SVGs (app/assets/brand/) at each required size instead
// of hand-maintaining separate PNGs. Run via `npm run icons:generate`
// whenever either SVG changes.

const brandDir = path.resolve(process.cwd(), 'app/assets/brand')
const outDir = path.resolve(process.cwd(), 'public/icons')
mkdirSync(outDir, { recursive: true })

const markSvg = readFileSync(path.join(brandDir, 'tindahan-mark.svg'), 'utf8')
const maskableSvg = readFileSync(path.join(brandDir, 'tindahan-mark-maskable.svg'), 'utf8')

function rasterize(svg: string, size: number): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
}

// Filenames are locked to nuxt.config.ts's manifest/head icon references and
// to tests/e2e/10-app-icons.spec.ts's assertions - keep them in sync.
const targets: Array<{ name: string; svg: string; size: number }> = [
  { name: 'storefront-16.png', svg: markSvg, size: 16 },
  { name: 'storefront-32.png', svg: markSvg, size: 32 },
  { name: 'storefront-180.png', svg: markSvg, size: 180 },
  { name: 'storefront-192.png', svg: markSvg, size: 192 },
  { name: 'storefront-512.png', svg: markSvg, size: 512 },
  { name: 'storefront-512-maskable.png', svg: maskableSvg, size: 512 },
]

for (const { name, svg, size } of targets) {
  writeFileSync(path.join(outDir, name), rasterize(svg, size))
}

// Orphaned pre-rebrand assets: superseded by the storefront-*.png set above
// and no longer referenced by the manifest, head links, or any test.
for (const stale of ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'storefront-source.png']) {
  const stalePath = path.join(outDir, stale)
  if (existsSync(stalePath)) rmSync(stalePath)
}

console.log('Icons written to', outDir)
