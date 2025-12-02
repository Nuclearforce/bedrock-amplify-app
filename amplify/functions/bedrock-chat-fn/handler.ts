// amplify/functions/bedrock-chat-fn/handler.ts
import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const region =
  process.env.BEDROCK_REGION ||
  process.env.AWS_REGION ||
  "us-east-1";

// Knowledge Base ID from Bedrock
const knowledgeBaseId =
  process.env.KB_ID || "IVIFHG7AO2";

// Model / inference profile to use with the KB
// Prefer a dedicated KB_MODEL_ARN, else fall back to your existing LLAMA_MODEL_ID.
const modelArn =
  process.env.KB_MODEL_ARN ||
  process.env.LLAMA_MODEL_ID || // re-use your old llama inference profile if you want
  "arn:aws:bedrock:us-east-1:604426749416:inference-profile/us.meta.llama4-maverick-17b-instruct-v1:0";

const client = new BedrockAgentRuntimeClient({ region });

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

    // Build a prompt that includes a small history context (optional)
    let prompt: string;

    if (history.length > 0) {
      const historyText = history
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
      prompt =
        `Here is the previous conversation:\n` +
        `${historyText}\n\n` +
        `The user now asks: ${userMessage}`;
    } else {
      prompt = userMessage;
    }

    const command = new RetrieveAndGenerateCommand({
      input: {
        text: prompt,
      },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId,
          modelArn, // <-- this is what TypeScript was complaining about
        },
      },
    });

    const result = await client.send(command);

    const reply = result.output?.text ?? "";

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
