import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, to, subject, text, accessToken } = await req.json();

    if (!provider || !to || !subject || !text || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (provider === 'google') {
      // 1. Construct raw message for Gmail (requires base64url encoding)
      // This is a minimal implementation wrapper
      const str = `To: ${to}\nSubject: ${subject}\n\n${text}`;
      const encodedMessage = btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Gmail API Error');
      
      return new Response(JSON.stringify({ success: true, provider: 'google', data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } 
    
    if (provider === 'microsoft') {
      const msBody = {
        message: {
          subject: subject,
          body: { contentType: "Text", content: text },
          toRecipients: [{ emailAddress: { address: to } }]
        },
        saveToSentItems: "true"
      };

      const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(msBody)
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Graph API Error: ${errText}`);
      }

      return new Response(JSON.stringify({ success: true, provider: 'microsoft' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown provider' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
