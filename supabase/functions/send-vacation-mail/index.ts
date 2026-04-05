import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Attachment {
  filename: string;
  content: string; // base64-encoded
  mimeType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { provider, to, subject, text, accessToken, attachment } = await req.json() as {
      provider: string;
      to: string;
      subject: string;
      text: string;
      accessToken: string;
      attachment?: Attachment;
    };

    if (!provider || !to || !subject || !text || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (provider === 'google') {
      // MIME multipart/mixed um Anhang zu unterstützen
      const boundary = "----=_Part_Away_" + Date.now();
      let mimeBody = [
        `MIME-Version: 1.0`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=UTF-8`,
        `Content-Transfer-Encoding: quoted-printable`,
        ``,
        text,
      ].join("\r\n");

      if (attachment) {
        mimeBody += [
          ``,
          `--${boundary}`,
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
          `Content-Transfer-Encoding: base64`,
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          ``,
          attachment.content,
        ].join("\r\n");
      }

      mimeBody += `\r\n--${boundary}--`;

      // base64url encoding für Gmail API
      const encodedMessage = btoa(unescape(encodeURIComponent(mimeBody)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

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
      const msBody: {
        message: {
          subject: string;
          body: { contentType: string; content: string };
          toRecipients: { emailAddress: { address: string } }[];
          attachments?: {
            "@odata.type": string;
            name: string;
            contentType: string;
            contentBytes: string;
          }[];
        };
        saveToSentItems: string;
      } = {
        message: {
          subject: subject,
          body: { contentType: "Text", content: text },
          toRecipients: [{ emailAddress: { address: to } }]
        },
        saveToSentItems: "true"
      };

      if (attachment) {
        msBody.message.attachments = [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: attachment.filename,
            contentType: attachment.mimeType,
            contentBytes: attachment.content,
          }
        ];
      }

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
