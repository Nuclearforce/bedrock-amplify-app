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
import * as lambda from "aws-cdk-lib/aws-lambda";

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

// ===== Grant Lambda permission to call Bedrock (Models, KBs, Agents) =====
const bedrockPolicy = new iam.PolicyStatement({
  actions: [
    // Used under the hood by RetrieveAndGenerate
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",

    // Knowledge Base / Agent Runtime APIs
    "bedrock:Retrieve",
    "bedrock:RetrieveAndGenerate",
    "bedrock:GetInferenceProfile",

    "bedrock:InvokeAgent",
    "bedrock:InvokeAgentWithResponseStream",
  ],
  resources: ["*"], // you can later restrict this to specific model / KB ARNs
});

backend.bedrockChatFn.resources.lambda.addToRolePolicy(bedrockPolicy);

// ===== Create Lambda Function URL (bypass API Gateway 30s limit) =====
const fnUrl = new lambda.FunctionUrl(apiStack, "ChatFnUrl", {
  function: backend.bedrockChatFn.resources.lambda, // <-- IFunction is fine
  authType: lambda.FunctionUrlAuthType.NONE,        // 🔒 use IAM in prod
});

// ===== Export API details to frontend =====
backend.addOutput({
  custom: {
    CHAT_API: {
      endpoint: fnUrl.url,          // 🔹 use function URL
      region: Stack.of(apiStack).region,
      apiName: "LambdaFunctionUrl", // label only
      path: "",                     // no extra path
    },
  },
});

export default backend;
