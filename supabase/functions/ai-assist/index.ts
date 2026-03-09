import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 10;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const { type, context } = await req.json();

    // Fetch user's AI config
    let { data: aiConfig } = await supabase
      .from("ai_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const provider = aiConfig?.provider || "free";
    const today = new Date().toISOString().split("T")[0];
    const dailyCount =
      aiConfig?.last_usage_date === today
        ? aiConfig?.daily_usage_count || 0
        : 0;

    // Free tier: check daily limit
    if (provider === "free" && dailyCount >= FREE_DAILY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "Daily AI limit reached. Configure your own API key in Settings → AI to unlock unlimited usage.",
          limit_reached: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build prompt based on type
    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "report_summary":
        systemPrompt =
          "You are a concise data analyst. Summarize the report data into 2-3 key insights. Be specific with numbers. Use bullet points.";
        userPrompt = `Report: ${context.title}\nData:\n${context.data}`;
        break;
      case "notification_digest":
        systemPrompt =
          "You are a productivity assistant. Summarize these notifications into a brief digest highlighting the most important items and suggested actions.";
        userPrompt = `Notifications:\n${context.notifications}`;
        break;
      case "smart_suggestions":
        systemPrompt =
          "You are a productivity coach. Based on user activity data, suggest 2-3 reports they should generate or actions to take. Be actionable and specific.";
        userPrompt = `Activity summary:\n${context.activity}`;
        break;
      case "anomaly_detection":
        systemPrompt =
          "You are a data anomaly detector. Analyze the data for unusual patterns, spikes, or concerning trends. Return findings as JSON: {anomalies: [{title: string, description: string, severity: 'low'|'medium'|'high'}]}";
        userPrompt = `Data to analyze:\n${context.data}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown AI assist type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Determine API endpoint and key
    let apiUrl: string;
    let apiKey: string;
    let model: string;

    if (provider === "free" || !aiConfig?.api_key_encrypted) {
      // Use Lovable AI gateway
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey)
        throw new Error("LOVABLE_API_KEY is not configured");
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = lovableKey;
      model = "google/gemini-2.5-flash-lite";
    } else if (provider === "openrouter") {
      // OpenRouter API (Llama, Mistral, etc.)
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiKey = aiConfig.api_key_encrypted;
      model = aiConfig.model_preference || "meta-llama/llama-4-maverick";
    } else {
      // User's own OpenAI or custom key
      const userKey = aiConfig.api_key_encrypted;
      if (aiConfig.model_preference?.startsWith("openai/")) {
        apiUrl = "https://api.openai.com/v1/chat/completions";
        model = aiConfig.model_preference.replace("openai/", "");
      } else {
        apiUrl = "https://api.openai.com/v1/chat/completions";
        model = aiConfig.model_preference || "gpt-4o-mini";
      }
      apiKey = userKey;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      throw new Error(`AI provider returned ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    // Update usage count
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (aiConfig) {
      await serviceClient
        .from("ai_config")
        .update({
          daily_usage_count: dailyCount + 1,
          last_usage_date: today,
        })
        .eq("user_id", user.id);
    } else {
      await serviceClient.from("ai_config").insert({
        user_id: user.id,
        provider: "free",
        daily_usage_count: 1,
        last_usage_date: today,
      });
    }

    return new Response(
      JSON.stringify({
        content,
        provider,
        remaining: provider === "free" ? FREE_DAILY_LIMIT - dailyCount - 1 : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("ai-assist error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
