const APP_RESUME_EVENT = "hysafe-app-resume";

export function emitAppResume(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(APP_RESUME_EVENT));
}

export function subscribeAppResume(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(APP_RESUME_EVENT, listener);
  return () => window.removeEventListener(APP_RESUME_EVENT, listener);
}
