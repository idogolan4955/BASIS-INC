/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' when building the iPhone app's bundle (apps/ios/scripts/bundle.mjs). */
  readonly VITE_BASIS_APP?: string;
  /** '1' when a build talks to the local emulators instead of production. */
  readonly VITE_BASIS_LOCAL?: string;
}
