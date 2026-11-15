import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  DeleteObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger.js';

export interface IStorageProvider {
  getObject<T>(key: string): Promise<T | null>;
  putObject(key: string, data: unknown): Promise<void>;
  listObjects(prefix: string): Promise<string[]>;
  deleteObject(key: string): Promise<void>;
}

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(bucket: string, region: string = process.env.AWS_REGION || 'us-east-1') {
    this.bucket = bucket;
    this.client = new S3Client({ region });
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );

      if (!response.Body) return null;
      const str = await response.Body.transformToString();
      return JSON.parse(str) as T;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'NoSuchKey' || (err as NoSuchKey).name === 'NoSuchKey') {
        return null;
      }
      Logger.error('S3_GET_ERROR', `Failed to get object: ${key}`, {
        details: { error: String(err) },
      });
      throw err;
    }
  }

  async putObject(key: string, data: unknown): Promise<void> {
    try {
      const body = JSON.stringify(data, null, 2);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: 'application/json',
        })
      );
    } catch (err: unknown) {
      Logger.error('S3_PUT_ERROR', `Failed to put object: ${key}`, {
        details: { error: String(err) },
      });
      throw err;
    }
  }

  async listObjects(prefix: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      let continuationToken: string | undefined = undefined;

      do {
        const response: ListObjectsV2CommandOutput = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        );

        if (response.Contents) {
          for (const item of response.Contents) {
            if (item.Key) keys.push(item.Key);
          }
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return keys;
    } catch (err: unknown) {
      Logger.error('S3_LIST_ERROR', `Failed to list objects for prefix: ${prefix}`, {
        details: { error: String(err) },
      });
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (err: unknown) {
      Logger.error('S3_DELETE_ERROR', `Failed to delete object: ${key}`, {
        details: { error: String(err) },
      });
      throw err;
    }
  }
}

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir: string = path.resolve(process.cwd(), '.local-s3')) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    const sanitized = key.replace(/^\/+/, '').split('/').join(path.sep);
    return path.join(this.baseDir, sanitized);
  }

  async getObject<T>(key: string): Promise<T | null> {
    const fullPath = this.resolvePath(key);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(content) as T;
    } catch (err: unknown) {
      Logger.error('LOCAL_STORAGE_READ_ERROR', `Failed to read local object: ${key}`, {
        details: { error: String(err) },
      });
      return null;
    }
  }

  async putObject(key: string, data: unknown): Promise<void> {
    const fullPath = this.resolvePath(key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  async listObjects(prefix: string): Promise<string[]> {
    const prefixSegments = prefix.replace(/^\/+/, '').split('/');
    // Scan all files recursively
    const allFiles: string[] = [];

    const walk = (currentDir: string, currentKeyPrefix: string) => {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const nextKey = currentKeyPrefix ? `${currentKeyPrefix}/${entry.name}` : entry.name;
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(entryPath, nextKey);
        } else if (entry.isFile()) {
          allFiles.push(nextKey);
        }
      }
    };

    walk(this.baseDir, '');
    const cleanPrefix = prefix.replace(/^\/+/, '');
    return allFiles.filter((k) => k.startsWith(cleanPrefix));
  }

  async deleteObject(key: string): Promise<void> {
    const fullPath = this.resolvePath(key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

let activeProvider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (activeProvider) return activeProvider;

  const bucket = process.env.S3_BUCKET_NAME;
  const useLocal = process.env.USE_LOCAL_STORAGE === 'true' || !bucket;

  if (useLocal) {
    const customDir = process.env.LOCAL_STORAGE_DIR || path.resolve(process.cwd(), '.local-s3');
    activeProvider = new LocalStorageProvider(customDir);
  } else {
    activeProvider = new S3StorageProvider(bucket!);
  }

  return activeProvider;
}

export function setStorageProvider(provider: IStorageProvider): void {
  activeProvider = provider;
}
