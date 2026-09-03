"use client";

import { toast as sonnerToast, type Toaster as SonnerToaster } from "sonner";

type ToastOptions = Parameters<typeof sonnerToast>[1];

export function toast(message: string, options?: ToastOptions) {
  return sonnerToast(message, options);
}

export function toastSuccess(message: string, options?: ToastOptions) {
  return sonnerToast.success(message, {
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 backdrop-blur-xl",
    ...options,
  });
}

export function toastError(message: string, options?: ToastOptions) {
  return sonnerToast.error(message, {
    className:
      "border-red-500/20 bg-red-500/10 text-red-300 backdrop-blur-xl",
    ...options,
  });
}

export function toastWarning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(message, {
    className:
      "border-gold-500/20 bg-gold-500/10 text-gold-300 backdrop-blur-xl",
    ...options,
  });
}

export function toastInfo(message: string, options?: ToastOptions) {
  return sonnerToast.info(message, {
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-300 backdrop-blur-xl",
    ...options,
  });
}

export function toastPromise<T>(
  promise: Promise<T>,
  opts: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  }
) {
  return sonnerToast.promise(promise, opts);
}

export { SonnerToaster };
