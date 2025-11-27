// amplify/functions/bedrock-chat-fn/handler.ts
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const region =
  process.env.BEDROCK_REGION ||
  process.env.AWS_REGION ||
  "us-west-1";

const modelId =
  process.env.LLAMA_MODEL_ID || "arn:aws:bedrock:us-west-1:604426749416:inference-profile/us.meta.llama4-maverick-17b-instruct-v1:0";

const client = new BedrockRuntimeClient({ region });

type HistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export const handler = async (event: any) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userMessage = (body.message || "").trim();
    const history: HistoryMessage[] = body.history || [];

    if (!userMessage) {
      return response(400, { error: "message is required" });
    }

    const messages: any[] = [];

    // optional history
    for (const m of history) {
      messages.push({
        role: m.role,
        content: [{ text: m.content }],
      });
    }

    // current user message
    messages.push({
      role: "user",
      content: [{ text: userMessage }],
    });

    const command = new ConverseCommand({
      modelId,
      messages,
      inferenceConfig: {
        maxTokens: 512,
        temperature: 0.3,
        topP: 0.9,
      },
    });

    const result = await client.send(command);

    const outputContent = result.output?.message?.content || [];
    let reply = "";
    for (const c of outputContent) {
      if ("text" in c) {
        // @ts-ignore – content items have a `text` field
        reply += c.text;
      }
    }

    return response(200, { reply });
  } catch (err: any) {
    console.error("Error in bedrock-chat-fn:", err);
    return response(500, {
      error: err?.message || "Internal server error",
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // tighten in prod
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
  };
}

function response(statusCode: number, body: any) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}
