// Memoria temporaria de chamadas ativas
global.activeCalls = global.activeCalls || {};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lead_id, contact_id, phone, lead_name } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  let cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone;
  }

  const callSessionId = 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Registra os dados da chamada vinculada ao Lead
  global.activeCalls[callSessionId] = {
    callSessionId,
    lead_id: lead_id || null,
    contact_id: contact_id || null,
    phone: cleanPhone,
    lead_name: lead_name || 'Lead',
    startedAt: Date.now(),
    status: 'in_progress'
  };

  // Também indexa pelo telefone limpo
  global.activeCalls['phone_' + cleanPhone] = global.activeCalls[callSessionId];

  return res.status(200).json({
    success: true,
    callSessionId,
    lead_id,
    phone: cleanPhone,
    lead_name,
    message: 'Chamada registrada no backend. Pronto para conectar.'
  });
}
