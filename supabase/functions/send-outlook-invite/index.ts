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
    const { accessToken, subject, start, end, attendees = [], body } = await req.json();

    if (!accessToken || !start || !end) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const event = {
      subject,
      body: { contentType: "HTML", content: body },
      start: { dateTime: `${start}T00:00:00`, timeZone: "Europe/Berlin" },
      end: { dateTime: `${end}T23:59:59`, timeZone: "Europe/Berlin" },
      attendees: attendees.map((email: string) => ({
        emailAddress: { address: email },
        type: "required"
      })),
      showAs: "oof", // Out of office
    };

    const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Graph API Event Error: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true, provider: 'microsoft_calendar' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
