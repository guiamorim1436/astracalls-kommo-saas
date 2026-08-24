export default function handler(req, res) {
  res.status(200).json({
    status: "healthy",
    service: "astracalls-kommo-saas",
    timestamp: new Date().toISOString()
  });
}
