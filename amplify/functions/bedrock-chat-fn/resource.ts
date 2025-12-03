import { defineFunction } from "@aws-amplify/backend";

export const bedrockChatFn = defineFunction({
  name: "bedrock-chat-fn",
  entry: "./handler.ts", // our Lambda handler file (Node.js)
  runtime: 20, // Node.js 20
  timeoutSeconds: 60,
  environment: {
    LLAMA_MODEL_ID: "arn:aws:bedrock:us-east-1:604426749416:inference-profile/us.meta.llama4-maverick-17b-instruct-v1:0", // 🔁 change to your actual Llama model ID
    BEDROCK_REGION: "us-east-1", 
    KB_ID: "IVIFHG7AO2",
    AGENT_ID: "VAHLL7GA4L",
    AGENT_ALIAS_ID: "HZ8OLFGZ25",
  },
  // We'll add IAM permissions in the API resource to keep this file simple
});
