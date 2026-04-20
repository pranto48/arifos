export {};

declare global {
  interface Window {
    lifeosDesktop?: {
      isDesktop: boolean;
      getServerUrl: () => Promise<string>;
      setServerUrl: (serverUrl: string) => Promise<string>;
      getConfig: () => Promise<Record<string, unknown>>;
      completeSetup: () => void;
    };
  }
}
