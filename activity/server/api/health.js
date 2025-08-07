// Bulletproof health check - cannot crash

export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    message: 'API is working'
  })
}