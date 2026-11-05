import { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { env } from "../config/env";
import { UnauthorizedError } from "../utils/errors";
import { logger } from "../utils/logger";

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Lazy-initialized Cognito verifier to avoid initialization overhead when running with MOCK_AUTH
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier && !env.MOCK_AUTH) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: env.COGNITO_USER_POOL_ID,
      tokenUse: "id",
      clientId: env.COGNITO_CLIENT_ID,
    });
  }
  return verifier;
}

/**
 * Express middleware to verify AWS Cognito JWT ID tokens.
 * Extracts the Bearer token from the Authorization header, verifies RSA signatures against AWS JWKS,
 * and populates `req.user` with `userId` (Cognito `sub`) and `email`.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // Development & Testing Bypass
  if (env.MOCK_AUTH) {
    if (!authHeader || authHeader.startsWith("Bearer mock-") || authHeader === "Bearer test-token") {
      req.user = {
        userId: "usr_mock123",
        email: "developer@pingboard.local",
      };
      return next();
    }
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid Authorization header. Expected Bearer token."));
  }

  const token = authHeader.substring(7).trim();

  try {
    const jwtVerifier = getVerifier();
    if (!jwtVerifier) {
      // In mock mode with explicit token
      req.user = {
        userId: "usr_mock123",
        email: "developer@pingboard.local",
      };
      return next();
    }

    const payload = await jwtVerifier.verify(token);
    req.user = {
      userId: payload.sub,
      email: (payload.email as string) || "",
    };
    next();
  } catch (err: unknown) {
    logger.warn("Cognito JWT verification failed", { error: (err as Error).message });
    next(new UnauthorizedError("Invalid or expired authentication token."));
  }
}
