// Minimal Foundry VTT v14 type shims — enough to satisfy strict TS for the
// surface this module actually uses. Foundry does not ship official types;
// the upstream community types package (`fvtt-types`) covers the full API
// but is heavy. Keep this file narrow and grow it on demand.

export {};

declare global {
  const Hooks: {
    once(event: string, cb: (...args: unknown[]) => unknown): number;
    on(event: string, cb: (...args: unknown[]) => unknown): number;
    off(event: string, id: number): void;
    callAll(event: string, ...args: unknown[]): boolean;
  };

  /** Narrow shim of Foundry's global `game` object — only the parts we use. */
  interface FoundryGame {
    modules: Map<string, { id: string; active: boolean; api?: unknown }>;
    settings: {
      register(namespace: string, key: string, data: Record<string, unknown>): void;
      get(namespace: string, key: string): unknown;
      set(namespace: string, key: string, value: unknown): Promise<unknown>;
    };
    i18n: {
      localize(key: string): string;
      format(key: string, data: Record<string, unknown>): string;
    };
    user?: { isGM: boolean; id: string };
    /**
     * Foundry's socket.io socket. Module messages travel on the
     * `module.<module-id>` event (requires `"socket": true` in module.json);
     * `emit` broadcasts to every *other* connected client.
     */
    socket?: {
      emit(event: string, data: unknown): void;
      on(event: string, cb: (data: unknown) => void): void;
      off(event: string, cb: (data: unknown) => void): void;
    };
  }

  const game: FoundryGame;

  /** Narrow shim of Foundry's global `ui` — only the notification toaster. */
  const ui: {
    notifications?: {
      info(message: string): void;
      warn(message: string): void;
      error(message: string): void;
    };
  };

  namespace foundry {
    namespace applications {
      namespace api {
        // ApplicationV2 is generic in v14; here we only model the lifecycle
        // surface the module uses. See https://foundryvtt.com/api/ for full.
        class ApplicationV2 {
          static DEFAULT_OPTIONS: Record<string, unknown>;
          constructor(options?: Record<string, unknown>);
          readonly id: string;
          readonly element: HTMLElement;
          render(force?: boolean | Record<string, unknown>): Promise<this>;
          close(options?: Record<string, unknown>): Promise<this>;

          protected _onRender(
            context: Record<string, unknown>,
            options: Record<string, unknown>,
          ): Promise<void>;
          protected _onClose(options: Record<string, unknown>): Promise<void>;
          protected _renderHTML(
            context: Record<string, unknown>,
            options: Record<string, unknown>,
          ): Promise<HTMLElement | string>;
          protected _replaceHTML(
            result: HTMLElement | string,
            content: HTMLElement,
            options: Record<string, unknown>,
          ): void;
        }
      }
    }
  }

  /**
   * Hook payload for `getSceneControlButtons` (Foundry passes the controls
   * array in-place for the module to mutate by pushing/adding tools).
   */
  interface FoundrySceneControl {
    name: string;
    title: string;
    icon: string;
    layer?: string;
    visible?: boolean;
    tools: Array<{
      name: string;
      title: string;
      icon: string;
      button?: boolean;
      onClick?: () => void;
      onChange?: () => void;
    }>;
    activeTool?: string;
  }
}
