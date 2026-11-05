import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Private S3 Bucket for hosting React SPA static bundle.
     * Public access is blocked; assets can only be requested via CloudFront CDN.
     */
    this.bucket = new s3.Bucket(this, "PingBoardWebBucket", {
      bucketName: `pingboard-web-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    /**
     * CloudFront CDN Distribution.
     * Serves frontend assets globally with HTTPS redirection, TLS 1.2+, and gzip/brotli compression.
     * Crucial: Error responses rewrite 403/404 to /index.html with HTTP 200 so React Router (SPA)
     * handles deep-links like /status/:slug or /monitors/:id seamlessly.
     */
    this.distribution = new cloudfront.Distribution(this, "PingBoardWebDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Cost-optimized (US/Europe)
    });

    /**
     * Automatic Deployment & Cache Invalidation.
     * Uploads the built Vite artifacts from apps/web/dist to the S3 bucket
     * and triggers a CloudFront invalidation for /*.
     */
    const webDistPath = path.resolve(__dirname, "../../../apps/web/dist");
    new s3deploy.BucketDeployment(this, "DeployPingBoardWeb", {
      sources: [s3deploy.Source.asset(webDistPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${this.distribution.distributionDomainName}`,
      description: "PingBoard CloudFront URL",
      exportName: "PingBoard-CloudFrontUrl",
    });
  }
}
