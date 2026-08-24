global.activeCalls = global.activeCalls || {};

const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN || "trainning";
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImI0OTViYTMwNWRmMzI5NTY0ZGE0N2VkN2M0ODZlNGRmMWVlNzRiZTJjYTA4ZDQ4ZjViZjc2MWM0NWQ4MjRjOGY2ZWVjMTI3MmQyYmQ0NGNkIn0.eyJhdWQiOiI5ZTc5ZTA3OC00YTg5LTQxMjMtYmUxNS0xZTgwZGFiNDZhZjUiLCJqdGkiOiJiNDk1YmEzMDVkZjMyOTU2NGRhNDdlZDdjNDg2ZTRkZjFlZTc0YmUyY2EwOGQ0OGY1YmY3NjFjNDVkODI0YzhmNmVlYzEyNzJkMmJkNDRjZCIsImlhdCI6MTc4NzU4MzEyMSwibmJmIjoxNzg3NTgzMTIxLCJleHAiOjE5NDUyOTYwMDAsInN1YiI6IjEzNTA0MjYwIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMzMzI0ODQ3LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOTg5NmRmNmMtOTkyYS00Y2ViLWJlMTUtYTgwNWQzMDk3YzU0IiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.l8dwi_xX_PEjjKeeNI7utTzjhuhHlQD-OjKgfujhEgp-km1TgwIvksPcSa6QeitPKT1nIyvKwp7dfu2I6EtJnKPn-5dapVciB-IOVIIJ28zy8AlRGvGu-zxozhLXr91GlxcFot9itFZECQNPRowa60tQGaR9mfo2c9ZWfEjTTopnVzHp0-AySqa2UX4uqfCUZ9C3y63LL5oYuUqkOl4hX0M4LWd2xu7-ma_rq2FnBFjENrku8LePguLamBDwzRyATioXcNkJ-ob9UxBBGuFzAMogeY82PvOyXrmQlIRrigl_KSYjbCk2MyDguUf9tuu__LJTKVSCkWu2iwrIgqXp0g";
const ASTRACALLS_PUBLIC_URL = process.env.ASTRACALLS_URL || "https://atlascall-astracalls.okgklo.easypanel.host";

async function postCallToKommo(payload) {
  const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/calls`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return { status: resp.status, data: await resp.json().catch(() => ({})) };
}

async function addNoteToLead(leadId, text) {
  if (!leadId) return null;
  const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}/notes`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KOMMO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      {
        note_type: 'common',
        params: { text }
      }
    ])
  });
  return { status: resp.status };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { callSessionId, phone, duration, lead_id, recording_url } = req.body || {};

  let cleanPhone = String(phone || '').replace(/\D/g, '');
  if (cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone;
  }

  // Busca chamada ativa registrada no início
  const sessionData = (callSessionId && global.activeCalls[callSessionId]) ||
                      global.activeCalls['phone_' + cleanPhone] || {};

  const effectiveLeadId = lead_id || sessionData.lead_id;
  const durSec = parseInt(duration || 0, 10);
  const isAnswered = durSec >= 3;
  const callStatus = isAnswered ? 4 : 6; // 4 = Falou com o cliente, 6 = Não atendeu

  const uniqId = 'WACALL_' + Date.now();

  // 1. Posta na API oficial de Chamadas do Kommo
  const callPayload = [
    {
      direction: 'outbound',
      uniq: uniqId,
      duration: Math.max(durSec, 1),
      source: 'WhatsApp (AstraCalls)',
      link: recording_url || `${ASTRACALLS_PUBLIC_URL}/`,
      phone: '+' + cleanPhone,
      call_status: callStatus,
      created_by: 13504260
    }
  ];

  const kommoRes = await postCallToKommo(callPayload);

  // 2. Se temos o Lead_ID, adiciona também uma nota detalhada de confirmação
  if (effectiveLeadId) {
    const statusText = isAnswered ? `Atendida (${durSec}s)` : 'Não atendida / Sem resposta';
    const noteText = `📞 **Ligação WhatsApp Realizada**\n` +
                     `• **Destinatário:** +${cleanPhone}\n` +
                     `• **Status:** ${statusText}\n` +
                     `• **Duração:** ${durSec} segundos\n` +
                     `• **Gravador:** AstraCalls`;
    await addNoteToLead(effectiveLeadId, noteText);
  }

  // Limpa da memória
  if (callSessionId) delete global.activeCalls[callSessionId];
  if (cleanPhone) delete global.activeCalls['phone_' + cleanPhone];

  return res.status(200).json({
    success: true,
    kommo: kommoRes,
    lead_id: effectiveLeadId,
    phone: cleanPhone,
    duration: durSec,
    call_status: callStatus
  });
}
