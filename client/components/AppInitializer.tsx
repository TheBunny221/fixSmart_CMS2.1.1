import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useSystemConfig } from "../contexts/SystemConfigContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { setCredentials, clearCredentials } from "../store/slices/authSlice";
import { initializeLanguage } from "../store/slices/languageSlice";
import { initializeTheme, setOnlineStatus } from "../store/slices/uiSlice";
import { useGetCurrentUserQuery } from "../store/api/authApi";

// Error logging utility - avoid accessing error.data to prevent response body issues
const logAuthError = (context: string, error: any) => {
  console.group(`🔐 Auth Error - ${context}`);
  console.error("Error:", error);
  if (error?.status) {
    console.error("HTTP Status:", error.status);
  }
  // Note: Avoiding error.data access to prevent "Response body is already used" errors
  console.groupEnd();
};

interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [isInitialized, setIsInitialized] = useState(false);
  const { appName, isInitialized: isConfigReady, isLoading: isConfigLoading } =
    useSystemConfig();

  // Set document title
  useDocumentTitle();

  // Get token from localStorage and check Redux state
  const token = localStorage.getItem("token");
  const hasValidToken = token && token !== "null" && token !== "undefined";

  // Check if Redux already has auth state
  const reduxAuth = useAppSelector((state) => state.auth);
  const isAlreadyAuthenticated = Boolean(
    reduxAuth.isAuthenticated && reduxAuth.user && reduxAuth.token
  );

  // Use RTK Query to get current user if we have a token but are not already authenticated
  const {
    data: userResponse,
    isLoading: isLoadingUser,
    error: userError,
  } = useGetCurrentUserQuery(undefined, {
    skip: !hasValidToken || isAlreadyAuthenticated, // Skip query if no token or already authenticated
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize theme
        try {
          dispatch(initializeTheme());
        } catch (themeError) {
          console.warn("Theme initialization failed:", themeError);
        }

        // Initialize language
        try {
          dispatch(initializeLanguage());
        } catch (langError) {
          console.warn("Language initialization failed:", langError);
        }

        // Handle auto-login based on token and user query result
        if (hasValidToken) {
          if (isAlreadyAuthenticated) {
            // Already authenticated, no need to do anything
            console.log("Already authenticated, skipping initialization");
          } else if (userResponse?.data?.user) {
            // Token is valid and we have user data - set credentials
            dispatch(
              setCredentials({
                token,
                user: userResponse.data.user,
              }),
            );
          } else if (userError) {
            // Handle different types of auth errors
            const error = userError as any;

            logAuthError("User Query Failed", error);

            // Handle specific error types - avoid accessing error.data
            const isServerError = error.status >= 500;
            const isUnauthorized = error.status === 401;

            if (isServerError) {
              console.warn(
                "🚨 Server issue detected - not clearing user credentials",
              );
              console.log(
                "User can continue with cached data until server recovers",
              );

              // Don't clear credentials for server issues - user might be able to continue
              // with cached data until the server recovers
              setIsInitialized(true);
              return;
            }

            // Clear invalid credentials for unauthorized or other client errors
            if (isUnauthorized || error.status < 500) {
              dispatch(clearCredentials());
            }
            localStorage.removeItem("token");

            // Log specific error types for debugging
            const errorCode = error?.data?.code || error?.data?.error || null;
            if (errorCode) {
              console.log(`📋 Handling auth error: ${errorCode}`);

              switch (errorCode) {
                case "TOKEN_EXPIRED":
                  console.log("🕒 Token expired, user needs to login again");
                  break;
                case "TOKEN_INVALID":
                case "TOKEN_MALFORMED":
                  console.log("🔍 Invalid token format, clearing credentials");
                  break;
                case "USER_NOT_FOUND":
                  console.log("👤 User account no longer exists");
                  break;
                case "ACCOUNT_DEACTIVATED":
                  console.log("🚫 User account has been deactivated");
                  break;
                default:
                  console.log("❓ Unknown authentication error");
              }
            }

            console.log("✅ Invalid token cleared successfully");
          } else if (token && !reduxAuth.token) {
            // Have token in localStorage but not in Redux - sync it
            console.log("Syncing token from localStorage to Redux");
            // This will trigger the getCurrentUser query
          }
          // If still loading, we'll wait for the query to complete
        }

        // Setup online/offline listeners with error handling
        const handleOnline = () => {
          try {
            dispatch(setOnlineStatus(true));
          } catch (error) {
            console.warn("Failed to update online status:", error);
          }
        };

        const handleOffline = () => {
          try {
            dispatch(setOnlineStatus(false));
          } catch (error) {
            console.warn("Failed to update offline status:", error);
          }
        };

        try {
          window.addEventListener("online", handleOnline);
          window.addEventListener("offline", handleOffline);
        } catch (listenerError) {
          console.warn(
            "Failed to add online/offline listeners:",
            listenerError,
          );
        }

        // Cleanup function
        return () => {
          try {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
          } catch (cleanupError) {
            console.warn("Failed to remove event listeners:", cleanupError);
          }
        };
      } finally {
        // Only set initialized when we're done with the user query (or don't need it)
        if (
          !hasValidToken ||
          isAlreadyAuthenticated ||
          userResponse ||
          userError
        ) {
          setIsInitialized(true);
        }
      }
    };

    initializeApp();
  }, [
    dispatch,
    hasValidToken,
    userResponse,
    userError,
    token,
    isAlreadyAuthenticated,
    reduxAuth.token,
  ]);

  // Show loading screen while initializing or checking user (but not if already authenticated)
  if (
    !isInitialized ||
    isConfigLoading ||
    !isConfigReady ||
    (hasValidToken && !isAlreadyAuthenticated && isLoadingUser)
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {appName}
          </h2>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer;
