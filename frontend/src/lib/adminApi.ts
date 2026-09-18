export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://localhost:5000/api';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('linkup_admin_token');

    if (
      !token ||
      token === 'null' ||
      token === 'undefined' ||
      token.trim() === '' ||
      !token.includes('.')
    ) {
      if (token) {
        localStorage.removeItem('linkup_admin_token');
      }

      return null;
    }

    return token;
  }

  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('linkup_admin_token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('linkup_admin_token');
    localStorage.removeItem('linkup_admin_user');
  }
}

export async function adminFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data: any;

  try {
    data = await res.json();
  } catch {
    data = {
      success: false,
      message: 'Invalid server response',
    };
  }

  if (!res.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

export async function uploadImage(
  file: File,
  folder = 'linkup_cms'
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();

  formData.append('image', file);
  formData.append('folder', folder);

  const res = await adminFetch('/upload', {
    method: 'POST',
    body: formData,
  });

  return {
    url: res.url,
    publicId: res.publicId,
  };
}
