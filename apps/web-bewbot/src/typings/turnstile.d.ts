interface Window {
  turnstile?: {
    remove: (widgetId: string) => void;
    render: (
      container: HTMLElement | string,
      options: {
        action?: string;
        callback?: (token: string) => void;
        cData?: string;
        'error-callback'?: () => void;
        'expired-callback'?: () => void;
        sitekey: string;
        size?: string;
        theme?: string;
      },
    ) => string;
    reset: (widgetId?: string) => void;
  };
}
