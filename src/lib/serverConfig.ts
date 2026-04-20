const LOCAL_STORAGE_KEY = 'lifeos_server_url';

export const isDesktopRuntime = () => Boolean(window.lifeosDesktop?.isDesktop);

export const getServerUrl = async (): Promise<string> => {
  if (window.lifeosDesktop?.isDesktop) {
    return window.lifeosDesktop.getServerUrl();
  }

  return localStorage.getItem(LOCAL_STORAGE_KEY) || '';
};

export const setServerUrl = async (serverUrl: string): Promise<string> => {
  const normalized = serverUrl.trim().replace(/\/+$/, '');

  if (window.lifeosDesktop?.isDesktop) {
    return window.lifeosDesktop.setServerUrl(normalized);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
  return normalized;
};
