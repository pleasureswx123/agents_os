import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PutObjectInput {
  objectKey: string;
  body: Buffer;
  contentType: string;
}

@Injectable()
export class StorageProvider implements OnModuleDestroy {
  private readonly bucket = process.env.S3_BUCKET ?? 'agents-os';
  private readonly client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'agents_os',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'agents_os_password'
    }
  });

  async putObject(input: PutObjectInput) {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType
      })
    );
    return { bucket: this.bucket, objectKey: input.objectKey, sizeBytes: input.body.byteLength };
  }

  async getDownloadUrl(objectKey: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey
      }),
      { expiresIn: 60 * 10 }
    );
  }

  async getObject(objectKey: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey
      })
    );
    return Buffer.from(await response.Body!.transformToByteArray());
  }

  async objectExists(objectKey: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    this.client.destroy();
  }

  private async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }
}
