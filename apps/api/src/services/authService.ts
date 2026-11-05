import crypto from "crypto";
import { env } from "../config/env";
import { BadRequestError, UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";

function calculateSecretHash(username: string): string | undefined {
  if (!env.COGNITO_CLIENT_SECRET) return undefined;
  return crypto
    .createHmac("sha256", env.COGNITO_CLIENT_SECRET)
    .update(username + env.COGNITO_CLIENT_ID)
    .digest("base64");
}

async function callCognito(target: string, payload: Record<string, unknown>) {
  const region = env.AWS_REGION || "ap-south-1";
  const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as any;
  if (!res.ok || data.__type) {
    const errorType = (data.__type || "CognitoError").split("#").pop();
    const message = data.message || "Authentication request failed";
    logger.warn(`Cognito error on ${target}`, { errorType, message });
    throw new BadRequestError(message, { type: errorType });
  }

  return data;
}

export async function loginUser(email: string, password: string) {
  const secretHash = calculateSecretHash(email);
  const authParams: Record<string, string> = {
    USERNAME: email,
    PASSWORD: password,
  };
  if (secretHash) {
    authParams.SECRET_HASH = secretHash;
  }

  const data = await callCognito("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: env.COGNITO_CLIENT_ID,
    AuthParameters: authParams,
  });

  const authResult = data.AuthenticationResult;
  if (!authResult || !authResult.IdToken) {
    throw new UnauthorizedError("Authentication failed: No token returned.");
  }

  const payloadBase64 = authResult.IdToken.split(".")[1];
  const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());

  return {
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    refreshToken: authResult.RefreshToken,
    expiresIn: authResult.ExpiresIn,
    user: {
      id: payload.sub,
      email: payload.email || email,
    },
  };
}

export async function signupUser(email: string, password: string) {
  const secretHash = calculateSecretHash(email);
  const payload: Record<string, unknown> = {
    ClientId: env.COGNITO_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  };
  if (secretHash) {
    payload.SecretHash = secretHash;
  }

  const data = await callCognito("SignUp", payload);
  return {
    userSub: data.UserSub,
    userConfirmed: data.UserConfirmed,
    codeDeliveryDetails: data.CodeDeliveryDetails,
  };
}

export async function confirmUser(email: string, code: string) {
  const secretHash = calculateSecretHash(email);
  const payload: Record<string, unknown> = {
    ClientId: env.COGNITO_CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
  };
  if (secretHash) {
    payload.SecretHash = secretHash;
  }

  await callCognito("ConfirmSignUp", payload);
  return { success: true };
}

export async function resendConfirmationCode(email: string) {
  const secretHash = calculateSecretHash(email);
  const payload: Record<string, unknown> = {
    ClientId: env.COGNITO_CLIENT_ID,
    Username: email,
  };
  if (secretHash) {
    payload.SecretHash = secretHash;
  }

  const data = await callCognito("ResendConfirmationCode", payload);
  return { codeDeliveryDetails: data.CodeDeliveryDetails };
}
