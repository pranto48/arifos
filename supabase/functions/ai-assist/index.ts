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
      .maybeSingle();

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
          error:
            "Daily AI limit reached. Configure your own API key in Settings → AI to unlock unlimited usage.",
          limit_reached: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build prompt based on type
    let systemPrompt = "";
    let userPrompt = "";
    let useToolCalling = false;
    let tools: any[] = [];
    let toolChoice: any = undefined;

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
          "You are a productivity coach. Based on user activity data, suggest 2-4 actionable items. Return as JSON array: [{title, description, action?, link?}]. link can be: tasks, goals, budget, notes, habits.";
        userPrompt = `Activity summary:\n${JSON.stringify(context)}`;
        break;
      case "anomaly_detection":
        systemPrompt =
          'You are a data anomaly detector. Analyze the data for unusual patterns, spikes, or concerning trends. Return as JSON array: [{title, description, severity: "low"|"medium"|"high", category?}]';
        userPrompt = `Data to analyze:\n${JSON.stringify(context)}`;
        break;

      // ====== NEW AI CAPABILITIES ======

      case "ocr_document":
        systemPrompt = `You are a document analysis expert. Extract all text, numbers, dates, and key information from the document image/content provided. Structure your response clearly with:
- **Document Type**: (receipt, invoice, contract, letter, etc.)
- **Key Fields**: extracted data as key-value pairs
- **Line Items**: any itemized entries with amounts
- **Total Amount**: if applicable
- **Dates**: any dates found
- **Raw Text**: full extracted text

Be thorough and precise with numbers and amounts.`;
        userPrompt = context.imageBase64
          ? `Analyze this document image and extract all information.`
          : `Extract information from this document text:\n${context.documentText}`;
        break;

      case "smart_categorize":
        systemPrompt =
          "You are a task organization expert. Analyze the provided tasks and suggest optimal category assignments.";
        userPrompt = `Here are tasks that need categorization. Available categories: ${JSON.stringify(context.categories)}.\n\nTasks to categorize:\n${JSON.stringify(context.tasks)}`;
        useToolCalling = true;
        tools = [
          {
            type: "function",
            function: {
              name: "categorize_tasks",
              description: "Assign categories to tasks based on their content",
              parameters: {
                type: "object",
                properties: {
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task_id: { type: "string" },
                        category_id: { type: "string" },
                        confidence: {
                          type: "number",
                          description: "0-1 confidence score",
                        },
                        reason: { type: "string" },
                      },
                      required: ["task_id", "category_id", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["assignments"],
                additionalProperties: false,
              },
            },
          },
        ];
        toolChoice = {
          type: "function",
          function: { name: "categorize_tasks" },
        };
        break;

      case "predictive_insights":
        systemPrompt = `You are a predictive analytics expert. Analyze the user's historical data and provide actionable forecasts.`;
        userPrompt = `Analyze this data and provide predictions:\n${JSON.stringify(context)}`;
        useToolCalling = true;
        tools = [
          {
            type: "function",
            function: {
              name: "generate_predictions",
              description: "Generate predictive insights from user data",
              parameters: {
                type: "object",
                properties: {
                  predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["deadline", "budget", "productivity", "goal"],
                        },
                        confidence: { type: "number" },
                        severity: {
                          type: "string",
                          enum: ["info", "warning", "critical"],
                        },
                        suggested_action: { type: "string" },
                      },
                      required: [
                        "title",
                        "description",
                        "category",
                        "confidence",
                        "severity",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["predictions"],
                additionalProperties: false,
              },
            },
          },
        ];
        toolChoice = {
          type: "function",
          function: { name: "generate_predictions" },
        };
        break;

      case "natural_language_task":
        systemPrompt =
          "You are a task parsing assistant. Parse natural language into structured task data. Interpret relative dates based on today's date.";
        userPrompt = `Today is ${new Date().toISOString().split("T")[0]}. Parse this into a task:\n"${context.input}"\n\nAvailable categories: ${JSON.stringify(context.categories || [])}`;
        useToolCalling = true;
        tools = [
          {
            type: "function",
            function: {
              name: "create_task",
              description: "Create a structured task from natural language",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "urgent"],
                  },
                  due_date: {
                    type: "string",
                    description: "ISO date string YYYY-MM-DD",
                  },
                  category_name: {
                    type: "string",
                    description: "Best matching category name",
                  },
                  is_recurring: { type: "boolean" },
                  recurring_pattern: {
                    type: "string",
                    enum: [
                      "daily",
                      "weekly",
                      "biweekly",
                      "monthly",
                      "quarterly",
                      "yearly",
                    ],
                  },
                },
                required: ["title", "priority"],
                additionalProperties: false,
              },
            },
          },
        ];
        toolChoice = { type: "function", function: { name: "create_task" } };
        break;

      case "daily_planner":
        systemPrompt =
          "You are an expert daily planning assistant. Build a realistic, focused day plan from the user's tasks, calendar, habits, and priorities. Balance urgency, energy, and workload. Return structured JSON only.";
        userPrompt = `Today is ${new Date().toISOString().split("T")[0]}. Create a daily plan from this context:\n${JSON.stringify(context)}`;
        useToolCalling = true;
        tools = [
          {
            type: "function",
            function: {
              name: "generate_daily_plan",
              description:
                "Generate a practical daily plan with focus blocks, top priorities, and quick wins",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  focus: { type: "string" },
                  top_priorities: {
                    type: "array",
                    items: { type: "string" },
                  },
                  quick_wins: {
                    type: "array",
                    items: { type: "string" },
                  },
                  schedule_blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        time: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["title", "time"],
                      additionalProperties: false,
                    },
                  },
                  risks: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["summary", "top_priorities", "schedule_blocks"],
                additionalProperties: false,
              },
            },
          },
        ];
        toolChoice = {
          type: "function",
          function: { name: "generate_daily_plan" },
        };
        break;

      case "task_breakdown":
        systemPrompt =
          "You are a project execution assistant. Break a task into clear, actionable subtasks that are practical and logically ordered. Keep them concise and implementation-ready. Return structured JSON only.";
        userPrompt = `Break down this task into subtasks:\n${JSON.stringify(context)}`;
        useToolCalling = true;
        tools = [
          {
            type: "function",
            function: {
              name: "break_down_task",
              description: "Break a task into actionable subtasks",
              parameters: {
                type: "object",
                properties: {
                  overview: { type: "string" },
                  subtasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        reason: { type: "string" },
                        priority: {
                          type: "string",
                          enum: ["low", "medium", "high", "urgent"],
                        },
                      },
                      required: ["title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["subtasks"],
                additionalProperties: false,
              },
            },
          },
        ];
        toolChoice = {
          type: "function",
          function: { name: "break_down_task" },
        };
        break;

      case "note_to_tasks":
        systemPrompt =
          "You are a productivity assistant that extracts actionable tasks from notes. Convert note content into concrete tasks only when action is implied. Avoid vague or duplicate tasks. Return structured JSON only.";
        userPrompt = `Extract actionable tasks from this note:\n${JSON.stringify(context)}`;
        useToolCalling = true;
        tools = [
          {
            type: "function",
            function: {
              name: "extract_note_tasks",
              description: "Extract structured actionable tasks from a note",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: {
                          type: "string",
                          enum: ["low", "medium", "high", "urgent"],
                        },
                        category_name: { type: "string" },
                      },
                      required: ["title"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ];
        toolChoice = {
          type: "function",
          function: { name: "extract_note_tasks" },
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Unknown AI assist type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }

    // Determine API endpoint and key
    let apiUrl: string;
    let apiKey: string;
    let model: string;

    if (provider === "free" || !aiConfig?.api_key_encrypted) {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      apiKey = lovableKey;
      // Use flash for most tasks, pro for OCR (needs vision)
      model =
        type === "ocr_document"
          ? "google/gemini-2.5-flash"
          : "google/gemini-2.5-flash-lite";
    } else if (provider === "openrouter") {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiKey = aiConfig.api_key_encrypted;
      model = aiConfig.model_preference || "meta-llama/llama-4-maverick";
    } else {
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

    // Build messages - support multimodal for OCR
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (type === "ocr_document" && context.imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${context.mimeType || "image/jpeg"};base64,${context.imageBase64}`,
            },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    const requestBody: any = {
      model,
      messages,
      max_tokens:
        type === "ocr_document"
          ? 2000
          : ["daily_planner", "task_breakdown", "note_to_tasks"].includes(type)
            ? 1200
            : 800,
      temperature: type === "daily_planner" ? 0.4 : 0.3,
    };

    if (useToolCalling) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const errText = await response.text();
      console.error("AI API error:", response.status, errText);
      throw new Error(`AI provider returned ${response.status}`);
    }

    const result = await response.json();

    // Extract content - handle tool calls
    let content: any;
    const choice = result.choices?.[0];

    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      try {
        content = JSON.parse(toolCall.function.arguments);
      } catch {
        content = toolCall.function.arguments;
      }
    } else {
      content = choice?.message?.content || "";
    }

    // Update usage count
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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
        remaining:
          provider === "free" ? FREE_DAILY_LIMIT - dailyCount - 1 : null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
      },
    );
  }
});
