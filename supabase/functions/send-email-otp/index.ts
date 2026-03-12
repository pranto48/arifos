import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, code: verifyCode } = body;

    if (action === "send") {
      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Invalidate existing unused codes
      await supabaseAdmin
        .from("email_otp_codes")
        .update({ used: true })
        .eq("user_id", user.id)
        .eq("used", false);

      // Store new code
      const { error: insertError } = await supabaseAdmin
        .from("email_otp_codes")
        .insert({ user_id: user.id, code, expires_at: expiresAt });

      if (insertError) {
        console.error("[Email OTP] Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to generate code" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Resend API key
      const { data: secretData } = await supabaseAdmin
        .from("app_secrets")
        .select("value")
        .eq("id", "resend_api_key")
        .single();

      const resendKey = secretData?.value || Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "Email service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resend = new Resend(resendKey);

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const userName = profile?.full_name || "User";

      const { error: emailError } = await resend.emails.send({
        from: "LifeOS Security <onboarding@resend.dev>",
        to: [user.email!],
        subject: `${code} - Your LifeOS verification code`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; padding: 12px; background: #6366f1; border-radius: 12px;">
                <span style="font-size: 24px;">🔐</span>
              </div>
            </div>
            <h1 style="font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 8px; color: #1a1a1a;">Verification Code</h1>
            <p style="text-align: center; color: #666; margin-bottom: 32px;">Hi ${userName}, use this code to verify your identity:</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace;">${code}</span>
            </div>
            <p style="text-align: center; color: #999; font-size: 14px;">This code expires in 5 minutes.<br/>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });

      if (emailError) {
        console.error("[Email OTP] Send error:", emailError);
        return new Response(JSON.stringify({ error: "Failed to send email" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "verify") {
      if (!verifyCode || verifyCode.length !== 6) {
        return new Response(JSON.stringify({ error: "Invalid code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find valid unused code
      const { data: otpData, error: otpError } = await supabaseAdmin
        .from("email_otp_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", verifyCode)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpData) {
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark code as used
      await supabaseAdmin
        .from("email_otp_codes")
        .update({ used: true })
        .eq("id", otpData.id);

      return new Response(JSON.stringify({ success: true, verified: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Email OTP] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
