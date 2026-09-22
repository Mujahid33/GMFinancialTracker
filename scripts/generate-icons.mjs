import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const outDir = 'public/icons'
mkdirSync(outDir, { recursive: true })

const jobs = [
  { src: 'public/gm-logo.svg', out: `${outDir}/icon-192.png`, size: 192 },
  { src: 'public/gm-logo.svg', out: `${outDir}/icon-512.png`, size: 512 },
  { src: 'public/gm-logo-maskable.svg', out: `${outDir}/icon-maskable-512.png`, size: 512 },
  { src: 'public/gm-logo.svg', out: `${outDir}/apple-touch-icon.png`, size: 180 },
]

for (const job of jobs) {
  await sharp(job.src)
    .resize(job.size, job.size)
    .png()
    .toFile(job.out)
  console.log(`generated ${job.out}`)
}