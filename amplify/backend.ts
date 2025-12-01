// amplify/backend.ts
import { defineBackend } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import {
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

import { bedrockChatFn } from "./functions/bedrock-chat-fn/resource";

const backend = defineBackend({
  bedrockChatFn,
});

// ===== API Gateway stack =====
const apiStack = backend.createStack("chat-api-stack");

// REST API
const chatApi = new RestApi(apiStack, "ChatApi", {
  restApiName: "ChatApi",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS, // tighten in prod
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

// Lambda integration
const lambdaIntegration = new LambdaIntegration(
  backend.bedrockChatFn.resources.lambda
);

// /chat resource
const chatResource = chatApi.root.addResource("chat");

// POST /chat → Lambda
chatResource.addMethod("POST", lambdaIntegration);

// ===== Grant Lambda permission to call Bedrock (Knowledge Base) =====
const bedrockPolicy = new iam.PolicyStatement({
  actions: [
    // Used under the hood by RetrieveAndGenerate
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",

    // Knowledge Base / Agent Runtime APIs
    "bedrock:Retrieve",
    "bedrock:RetrieveAndGenerate",
  ],
  resources: ["*"], // you can later restrict this to specific model / KB ARNs
});

backend.bedrockChatFn.resources.lambda.addToRolePolicy(bedrockPolicy);

// ===== Output API endpoint into amplify_outputs.json =====
backend.addOutput({
  custom: {
    CHAT_API: {
      endpoint: chatApi.url,
      region: Stack.of(chatApi).region,
      apiName: chatApi.restApiName,
      path: "/chat",
    },
  },
});

export default backend;
