import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * AWS Cognito User Pool.
     * Manages user registration, authentication, email verification, and JWT issuance.
     */
    this.userPool = new cognito.UserPool(this, "PingBoardUserPool", {
      userPoolName: "pingboard-user-pool",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For production change to RETAIN
    });

    /**
     * Cognito User Pool Client for React Single-Page Application (SPA).
     * IMPORTANT: generateSecret must be FALSE for browser-based SPAs since public clients
     * cannot securely hold an application client secret.
     */
    this.userPoolClient = new cognito.UserPoolClient(this, "PingBoardWebClient", {
      userPool: this.userPool,
      userPoolClientName: "pingboard-web-client",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
      },
      idTokenValidity: cdk.Duration.hours(8),
      accessTokenValidity: cdk.Duration.hours(1),
    });

    // CloudFormation Outputs for frontend and API integration
    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: "PingBoard-UserPoolId",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: "PingBoard-UserPoolClientId",
    });
  }
}
