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

// ===== Grant Lambda permission to call Bedrock =====
const bedrockPolicy = new iam.PolicyStatement({
  actions: ["bedrock:InvokeModel", "bedrock:Converse"],
  resources: ["*"], // you can restrict to specific model ARN later
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
