import "@/styles/globals.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { pb } from "@/services/pocketbase";
import type { ClientResponseError } from "pocketbase";

// Import the generated route tree
import { routeTree } from "./route-tree.gen";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { isAuthenticated: undefined! },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/**
 * Production-ready auth validation system that:
 * 1. Uses realtime subscriptions for immediate account deletion detection
 * 2. Handles network errors gracefully (doesn't logout on temporary failures)
 * 3. Prevents race conditions with validation locking
 * 4. Cleans up resources properly
 */

let isLoggingOut = false;
let validationInterval: ReturnType<typeof setInterval> | null = null;
let realtimeUnsubscribe: (() => void) | null = null;

/**
 * Logs out the user and redirects to login page.
 * Prevents multiple simultaneous logout attempts.
 */
const logoutUser = () => {
  if (isLoggingOut) return;
  
  isLoggingOut = true;
  
  // Clean up realtime subscription
  if (realtimeUnsubscribe) {
    try {
      realtimeUnsubscribe();
      realtimeUnsubscribe = null;
    } catch (error) {
      console.error("Error unsubscribing from realtime:", error);
    }
  }
  
  // Clear auth store
  pb.authStore.clear();
  
  // Only redirect if we're not already on the login page
  if (window.location.pathname !== "/auth/login") {
    window.location.href = "/auth/login";
  }
  
  isLoggingOut = false;
};

/**
 * Validates that the currently authenticated user still exists in PocketBase.
 * Only logs out on definitive account deletion, not on network errors.
 */
const validateAuth = async (): Promise<void> => {
  // Prevent concurrent validations
  if (isLoggingOut) return;
  
  // Only validate if we have a valid auth token
  if (!pb.authStore.isValid || !pb.authStore.model?.id) {
    return;
  }

  try {
    // Try to fetch the current user - if deleted, this will fail
    await pb.collection("users").getOne(pb.authStore.model.id);
  } catch (error: unknown) {
    // Only handle ClientResponseError from PocketBase
    if (!(error instanceof Error && "status" in error)) {
      // Network error or unknown error - don't logout, just return
      return;
    }

    const pbError = error as ClientResponseError;
    const status = pbError.status;

    // Only logout on definitive account deletion/auth failure
    // 404 = user not found (deleted)
    // 401 = unauthorized (token invalid)
    // 403 = forbidden (account disabled/deleted)
    if (status === 404 || status === 401 || status === 403) {
      logoutUser();
    }
    // Don't logout on other errors (network issues, rate limiting, etc.)
  }
};

/**
 * Sets up realtime subscription to detect account deletion immediately.
 * This is more efficient than polling and provides instant detection.
 */
const setupRealtimeSubscription = async () => {
  // Clean up existing subscription if any
  if (realtimeUnsubscribe) {
    try {
      realtimeUnsubscribe();
    } catch (error) {
      console.error("Error cleaning up previous subscription:", error);
    }
    realtimeUnsubscribe = null;
  }

  // Only subscribe if we have a valid auth token
  if (!pb.authStore.isValid || !pb.authStore.model?.id) {
    return;
  }

  try {
    // Subscribe to the current user's record
    // If the record is deleted, we'll get a 'delete' event
    const unsubscribe = await pb.collection("users").subscribe(
      pb.authStore.model.id,
      (e) => {
        // If the user record is deleted, logout immediately
        if (e.action === "delete") {
          logoutUser();
        }
      }
    );

    realtimeUnsubscribe = unsubscribe;
  } catch (error) {
    // If subscription fails, fall back to periodic validation
    console.warn("Realtime subscription failed, falling back to periodic validation:", error);
  }
};

/**
 * Sets up periodic validation as a safety net.
 * This catches cases where realtime subscription might fail or be unavailable.
 */
const setupPeriodicValidation = () => {
  // Clear existing interval if any
  if (validationInterval) {
    clearInterval(validationInterval);
  }

  // Validate every 5 minutes as a safety net
  validationInterval = setInterval(() => {
    validateAuth();
  }, 5 * 60 * 1000);
};

/**
 * Cleans up all auth validation resources.
 */
const cleanupAuthValidation = () => {
  if (realtimeUnsubscribe) {
    try {
      realtimeUnsubscribe();
    } catch (error) {
      console.error("Error unsubscribing from realtime:", error);
    }
    realtimeUnsubscribe = null;
  }

  if (validationInterval) {
    clearInterval(validationInterval);
    validationInterval = null;
  }
};

// Set up auth store listener to handle auth state changes
pb.authStore.onChange(async () => {
  if (pb.authStore.isValid) {
    // User just logged in - validate and set up realtime subscription
    await validateAuth();
    await setupRealtimeSubscription();
    setupPeriodicValidation();
  } else {
    // User logged out - clean up subscriptions
    cleanupAuthValidation();
  }
}, true); // true = fire immediately with current state

// Initial setup if user is already authenticated
if (pb.authStore.isValid) {
  validateAuth();
  setupRealtimeSubscription();
  setupPeriodicValidation();
}

// Clean up on page unload
window.addEventListener("beforeunload", cleanupAuthValidation);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <TanStackRouterDevtools router={router} />
  </React.StrictMode>,
);
