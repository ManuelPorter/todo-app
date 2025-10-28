const path = require('path')
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = process.env.PORT || 3000

// Proxy API requests to Spring Boot backend
app.use('/api', createProxyMiddleware({ target: 'http://localhost:8080', changeOrigin: true }))

// Serve built frontend
const dist = path.resolve(__dirname, '..', 'dist')
app.use(express.static(dist))

app.get('*', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

app.listen(PORT, () => console.log(`Express server listening on http://localhost:${PORT}`))
