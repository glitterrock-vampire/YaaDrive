import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const r2Values = [accountId, accessKeyId, secretAccessKey, bucket];
const configuredValues = r2Values.filter(Boolean).length;

if (configuredValues > 0 && configuredValues < r2Values.length) {
  throw new Error('Configure all R2 variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET');
}
if (process.env.NODE_ENV === 'production' && configuredValues === 0) {
  throw new Error('Configure Cloudflare R2 before running the API in production');
}

export const objectStorage = configuredValues === r2Values.length
  ? {
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      }),
      bucket,
    }
  : null;
