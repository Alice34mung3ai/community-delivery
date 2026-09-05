import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

import { randomUUID } from 'crypto';

const REGION =
  process.env.AWS_REGION || 'eu-west-1';

const BUCKET =
  process.env.AWS_S3_BUCKET || '';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:
      process.env.AWS_ACCESS_KEY_ID || '',

    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadBufferToS3(
  buffer: Buffer,
  contentType: string,
  prefix = 'uploads/'
) {
  if (!BUCKET) {
    throw new Error(
      'AWS_S3_BUCKET not configured'
    );
  }

  const key =
    `${prefix}${randomUUID()}-${Date.now()}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private',
  });

  await s3.send(command);

  return {
    key,
    url: `s3://${BUCKET}/${key}`,
  };
}