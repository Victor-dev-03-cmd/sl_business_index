const sharp = require('sharp')
const path = require('path')

async function main() {
  const input = path.join(__dirname, '../public/logo.png')
  await sharp(input).resize(192, 192).toFile(path.join(__dirname, '../public/icons/pwa-192.png'))
  await sharp(input).resize(512, 512).toFile(path.join(__dirname, '../public/icons/pwa-512.png'))
  console.log('PWA icons generated')
}
main().catch(console.error)
