import type { InjectionKey } from 'vue';

// Injection keys shared between hosts (standalone SPA / Foundry module) and
// App.vue. Living under foundry/ because they primarily exist to let the
// Foundry host feed configuration into the otherwise host-agnostic SPA.

// The HTTP base URL the RpgAssistantService should prefix to its requests.
// Empty string = same origin (standalone SPA behind nginx). Non-empty =
// absolute URL to the gateway (Foundry module path).
export const API_BASE_URL_KEY: InjectionKey<string> = Symbol('rpgAssistantApiBaseUrl');
