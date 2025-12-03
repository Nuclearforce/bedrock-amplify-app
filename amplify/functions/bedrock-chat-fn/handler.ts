// amplify/functions/bedrock-chat-fn/handler.ts
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  ResponseStream,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { randomUUID } from "crypto";

const region =
  process.env.BEDROCK_REGION ||
  process.env.AWS_REGION ||
  "us-east-1";

const AGENT_ID = process.env.AGENT_ID || "VAHLL7GA4L";
const AGENT_ALIAS_ID = process.env.AGENT_ALIAS_ID || "HZ8OLFGZ25";

const client = new BedrockAgentRuntimeClient({ region });

type HistoryMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export const handler = async (event: any) => {

  const method =
    event.httpMethod || event.requestContext?.http?.method || "";

  // CORS preflight
  if (method  === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userMessage = (body.message || "").trim();
    const _history: HistoryMessage[] = body.history || []; // kept if you want it later
    const incomingSessionId: string | undefined = body.sessionId;

    if (!userMessage) {
      return response(400, { error: "message is required" });
    }

    // Keep the prompt small – let the Agent use its own session state
    const prompt = userMessage;
    const sessionId = incomingSessionId || randomUUID();

    const command = new InvokeAgentCommand({
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId,
      inputText: prompt,
    });

    const result = await client.send(command);

    let reply = "";
    const decoder = new TextDecoder("utf-8");

    if (result.completion && Symbol.asyncIterator in result.completion) {
      for await (const eventChunk of result.completion as AsyncIterable<ResponseStream>) {
        if (eventChunk.chunk?.bytes) {
          reply += decoder.decode(eventChunk.chunk.bytes);
        }
      }
    }

    // Optionally guard against empty reply
    if (!reply) {
      reply = "The agent didn't return a response in time. Please try a simpler or more specific question.";
    }

    return response(200, { reply, sessionId });
  } catch (err: any) {
    console.error("Error in bedrock-chat-fn:", err);
    return response(500, {
      error: err?.message || "Internal server error",
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
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
