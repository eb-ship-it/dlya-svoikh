import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const APK = path.resolve(
  'android/app/build/outputs/apk/debug/app-debug.apk'
)
const PORT = 8000

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} from ${req.socket.remoteAddress}`)
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html><meta charset="utf-8"><title>Для Своих APK</title>
      <body style="font-family:sans-serif;padding:40px;text-align:center">
        <h1>Для Своих — debug APK</h1>
        <p><a href="/app-debug.apk" download style="font-size:24px;padding:16px 32px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">⬇ Скачать APK</a></p>
        <p style="color:#666;margin-top:24px">После скачивания: открыть файл → разрешить установку из неизвестных источников → установить</p>
      </body>`)
    return
  }
  if (req.url === '/app-debug.apk') {
    const stat = fs.statSync(APK)
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="dlya-svoikh.apk"',
    })
    fs.createReadStream(APK).pipe(res)
    return
  }
  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`APK server running on port ${PORT}`)
  console.log(`APK size: ${(fs.statSync(APK).size / 1024 / 1024).toFixed(1)} MB`)
})
