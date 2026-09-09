import { getAccessToken } from './googleAuth';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
}

export interface UploadProgressCallback {
  (percentage: number, statusMessage: string): void;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

async function getAuthHeader(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must sign in with Google to access Google Drive. Please click "Sign in with Google".');
  }
  return `Bearer ${token}`;
}

/**
 * Searches for or creates a dedicated "Xeero AI Reels" folder on Google Drive.
 */
export async function getOrCreateXeeroFolder(folderName = 'Xeero AI Reels'): Promise<GoogleDriveFile> {
  const authHeader = await getAuthHeader();

  // 1. Search for existing folder
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)&pageSize=1`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: authHeader },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to query Google Drive folder (${searchRes.status})`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0];
  }

  // 2. Create the folder if not found
  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Directory for short-form 9:16 AI Reels and scripts generated with Xeero AI',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create Google Drive folder (${createRes.status})`);
  }

  return await createRes.json();
}

/**
 * List files in Google Drive (optionally inside Xeero folder or filtered by search query).
 */
export async function listDriveFiles(options: {
  folderId?: string;
  query?: string;
  mimeTypeFilter?: 'all' | 'videos' | 'docs';
  pageSize?: number;
} = {}): Promise<GoogleDriveFile[]> {
  const authHeader = await getAuthHeader();

  const queryParts: string[] = ['trashed=false'];

  if (options.folderId) {
    queryParts.push(`'${options.folderId}' in parents`);
  }

  if (options.query && options.query.trim()) {
    queryParts.push(`name contains '${options.query.trim().replace(/'/g, "\\'")}'`);
  }

  if (options.mimeTypeFilter === 'videos') {
    queryParts.push(`mimeType contains 'video/'`);
  } else if (options.mimeTypeFilter === 'docs') {
    queryParts.push(`(mimeType contains 'text/' or mimeType contains 'document' or mimeType contains 'pdf')`);
  }

  const finalQuery = queryParts.join(' and ');
  const fields = 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents)';
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(finalQuery)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&pageSize=${options.pageSize || 30}`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to list files from Google Drive (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Uploads a video (Blob or ArrayBuffer) directly to Google Drive via multipart upload.
 */
export async function uploadVideoToDrive(params: {
  videoBlob: Blob;
  filename: string;
  folderId?: string;
  description?: string;
  onProgress?: UploadProgressCallback;
}): Promise<GoogleDriveFile> {
  const authHeader = await getAuthHeader();

  if (params.onProgress) {
    params.onProgress(10, 'Diyaarinta faylka MP4 ee Google Drive...');
  }

  const metadata: Record<string, any> = {
    name: params.filename.endsWith('.mp4') ? params.filename : `${params.filename}.mp4`,
    mimeType: 'video/mp4',
    description: params.description || '9:16 Somali AI Reel exported from Xeero AI Reel Studio',
  };

  if (params.folderId) {
    metadata.parents = [params.folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeaderPart = `${delimiter}Content-Type: video/mp4\r\n\r\n`;

  const videoArrayBuffer = await params.videoBlob.arrayBuffer();

  if (params.onProgress) {
    params.onProgress(35, 'Dhisidda xogta MP4...');
  }

  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(metadataPart);
  const mediaHeaderBytes = encoder.encode(mediaHeaderPart);
  const closeBytes = encoder.encode(closeDelimiter);

  const totalLength = metaBytes.byteLength + mediaHeaderBytes.byteLength + videoArrayBuffer.byteLength + closeBytes.byteLength;
  const combinedBuffer = new Uint8Array(totalLength);

  let offset = 0;
  combinedBuffer.set(metaBytes, offset);
  offset += metaBytes.byteLength;

  combinedBuffer.set(mediaHeaderBytes, offset);
  offset += mediaHeaderBytes.byteLength;

  combinedBuffer.set(new Uint8Array(videoArrayBuffer), offset);
  offset += videoArrayBuffer.byteLength;

  combinedBuffer.set(closeBytes, offset);

  if (params.onProgress) {
    params.onProgress(60, 'Ku shubista Google Drive (Uploading 1080x1920 MP4)...');
  }

  const uploadUrl = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,createdTime`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combinedBuffer,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to upload MP4 to Google Drive (${res.status})`);
  }

  if (params.onProgress) {
    params.onProgress(100, 'Guul! MP4-ga si toos ah ayaa loogu keydiyay Google Drive.');
  }

  return await res.json();
}

/**
 * Uploads a Somali Script / Storyboard as a text / markdown file to Google Drive.
 */
export async function uploadScriptToDrive(params: {
  title: string;
  content: string;
  folderId?: string;
}): Promise<GoogleDriveFile> {
  const authHeader = await getAuthHeader();

  const filename = `${params.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_SCRIPT.txt`;
  const metadata: Record<string, any> = {
    name: filename,
    mimeType: 'text/plain',
    description: `Somali script and scene breakdown for "${params.title}" from Xeero AI Reel Studio`,
  };

  if (params.folderId) {
    metadata.parents = [params.folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = 
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
    `${delimiter}Content-Type: text/plain; charset=UTF-8\r\n\r\n${params.content}` +
    closeDelimiter;

  const uploadUrl = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to upload script to Google Drive (${res.status})`);
  }

  return await res.json();
}

/**
 * Delete a file from Google Drive.
 * WARNING: Calling component MUST display explicit confirmation dialog first per SKILL.md rules.
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const authHeader = await getAuthHeader();

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: authHeader,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to delete file from Google Drive (${res.status})`);
  }
}
