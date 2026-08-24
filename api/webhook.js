import endHandler from './call/end.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body || {};
  const phone = data.phone || data.peer || (data.data && data.data.phone);
  const duration = data.duration || (data.data && data.data.duration) || 0;
  const recording = data.recordingUrl || data.recording;

  if (phone) {
    req.body = {
      phone,
      duration,
      recording_url: recording
    };
    return endHandler(req, res);
  }

  return res.status(200).json({ status: 'ignored' });
}
