import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'fs'

const svg = readFileSync('public/icon.svg')

const sizes = [192, 512]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`)
  console.log(`Created icon-${size}.png`)
}

console.log('Done!')
