import { unlink } from 'fs/promises';

export async function removeFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    console.error('Error while removing file:', error instanceof Error ? error.message : 'Unknown error');
  }
} 