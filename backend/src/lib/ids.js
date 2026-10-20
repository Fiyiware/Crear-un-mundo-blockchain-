import { randomBytes, createHash } from 'node:crypto';

export const newId = (prefix) => `${prefix}_${randomBytes(9).toString('base64url')}`;

export const hex = (bytes) => randomBytes(bytes).toString('hex');

export const sha256Hex = (input) => createHash('sha256').update(input).digest('hex');
