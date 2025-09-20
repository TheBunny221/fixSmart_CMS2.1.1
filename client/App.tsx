import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { store } from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import AppInitializer from "./components/AppInitializer";
import GlobalMessageHandler from "./components/GlobalMessageHandler";
import AuthErrorHandler from "./components/AuthErrorHandler";
import UnifiedLayout from "./components/layouts/UnifiedLayout";
import OtpProvider from "./contexts/OtpContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import RoleBasedRoute from "./components/RoleBasedRoute";
import RoleBasedDashboard from "./components/RoleBasedDashboard";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "./contexts/ThemeProvider";

/** --- Small, consistent fallback --- */
const RouteLoader: React.FC<{ label?: string }> = ({
  label = "Loading...",
}) => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  </div>
);

/** --- Robust lazy with retry + one-time refresh for stale chunks --- */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  {
    retries = 3,
    baseDelay = 400,
  }: { retries?: number; baseDelay?: number } = {},
) {
  let attempt = 0;

  const load = async (): Promise<{ default: T }> => {
    try {
      return await factory();
    } catch (err) {
      attempt += 1;

      // If we have retries left, backoff and retry
      if (attempt <= retries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        return load();
      }

      // Final guard: if it looks like a chunk/import fetch error, reload once
      const key = "__lazy_chunk_reloaded__";
      const message = (err as Error)?.message ?? "";
      const isChunkError =
        /Loading chunk|import|Failed to fetch dynamically imported module|chunk/i.test(
          message,
        );

      if (isChunkError && typeof window !== "undefined") {
        const already = sessionStorage.getItem(key) === "1";
        if (!already) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      }

      // Rethrow if we can't recover
      throw err;
    }
  };

  return lazy(load);
}

/** --- Lazy imports (no file extensions, exact case matches filenames) --- */
const Index = lazyWithRetry(() => import("./pages/Index"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const SetPassword = lazyWithRetry(() => import("./pages/SetPassword"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));

const CitizenDashboard = lazyWithRetry(
  () => import("./pages/CitizenDashboard"),
);
const WardOfficerDashboard = lazyWithRetry(
  () => import("./pages/WardOfficerDashboard"),
);
const MaintenanceDashboard = lazyWithRetry(
  () => import("./pages/MaintenanceDashboard"),
);
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));

const ComplaintsList = lazyWithRetry(() => import("./pages/ComplaintsList"));
const ComplaintDetails = lazyWithRetry(
  () => import("./pages/ComplaintDetails"),
);
const CreateComplaint = lazyWithRetry(() => import("./pages/CreateComplaint"));
const CitizenComplaintForm = lazyWithRetry(
  () => import("./pages/CitizenComplaintForm"),
);
const GuestComplaintForm = lazyWithRetry(
  () => import("./pages/GuestComplaintForm"),
);
const UnifiedComplaintForm = lazyWithRetry(
  () => import("./pages/UnifiedComplaintForm"),
);
const QuickComplaintPage = lazyWithRetry(
  () => import("./pages/QuickComplaintPage"),
);
const GuestTrackComplaint = lazyWithRetry(
  () => import("./pages/GuestTrackComplaint"),
);
const GuestServiceRequest = lazyWithRetry(
  () => import("./pages/GuestServiceRequest"),
);
const GuestDashboard = lazyWithRetry(() => import("./pages/GuestDashboard"));

const WardTasks = lazyWithRetry(() => import("./pages/WardTasks"));
const WardManagement = lazyWithRetry(() => import("./pages/WardManagement"));

const MaintenanceTasks = lazyWithRetry(
  () => import("./pages/MaintenanceTasks"),
);
const TaskDetails = lazyWithRetry(() => import("./pages/TaskDetails"));

const AdminUsers = lazyWithRetry(() => import("./pages/AdminUsers"));
const UnifiedReports = lazyWithRetry(() => import("./pages/UnifiedReports"));
const AdminConfig = lazyWithRetry(() => import("./pages/AdminConfig"));
const AdminLanguages = lazyWithRetry(() => import("./pages/AdminLanguages"));

const Messages = lazyWithRetry(() => import("./pages/Messages"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ThemeProvider>
          <SystemConfigProvider>
            <AppInitializer>
              <OtpProvider>
                <TooltipProvider>
                  <Router>
                    <div className="min-h-screen bg-background text-foreground">
                      {/* Keep the outer UI immediate; scope Suspense to each route */}
                      <Routes>
                        {/* Public routes */}
                        <Route
                          path="/login"
                          element={
                            <Suspense
                              fallback={<RouteLoader label="Opening login…" />}
                            >
                              <Login />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/register"
                          element={
                            <Suspense
                              fallback={
                                <RouteLoader label="Opening register…" />
                              }
                            >
                              <Register />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/set-password/:token"
                          element={
                            <Suspense
                              fallback={
                                <RouteLoader label="Loading set password…" />
                              }
                            >
                              <SetPassword />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/guest/complaint"
                          element={
                            <Suspense fallback={<RouteLoader />}>
                              <GuestComplaintForm />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/complaint"
                          element={
                            <Suspense fallback={<RouteLoader />}>
                              <QuickComplaintPage />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/guest/track"
                          element={
                            <Suspense fallback={<RouteLoader />}>
                              <GuestTrackComplaint />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/guest/service-request"
                          element={
                            <Suspense fallback={<RouteLoader />}>
                              <GuestServiceRequest />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/guest/dashboard"
                          element={
                            <Suspense fallback={<RouteLoader />}>
                              <GuestDashboard />
                            </Suspense>
                          }
                        />
                        <Route
                          path="/unauthorized"
                          element={
                            <Suspense fallback={<RouteLoader />}>
                              <Unauthorized />
                            </Suspense>
                          }
                        />

                        {/* Home */}
                        <Route
                          path="/"
                          element={
                            <UnifiedLayout>
                              <Suspense
                                fallback={<RouteLoader label="Loading home…" />}
                              >
                                <Index />
                              </Suspense>
                            </UnifiedLayout>
                          }
                        />

                        {/* Dashboard (role-based) */}
                        <Route
                          path="/dashboard"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening dashboard…" />
                                  }
                                >
                                  <RoleBasedDashboard />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Complaints */}
                        <Route
                          path="/complaints"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Loading complaints…" />
                                  }
                                >
                                  <ComplaintsList />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaints/create"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening form…" />
                                  }
                                >
                                  <CreateComplaint />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaints/citizen-form"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["CITIZEN"]}>
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening form…" />
                                  }
                                >
                                  <QuickComplaintPage />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaints/new"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["CITIZEN"]}>
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening form…" />
                                  }
                                >
                                  <QuickComplaintPage />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaints/:id"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Loading complaint…" />
                                  }
                                >
                                  <ComplaintDetails />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaint/:id"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Loading complaint…" />
                                  }
                                >
                                  <ComplaintDetails />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Ward Officer */}
                        <Route
                          path="/tasks"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["WARD_OFFICER"]}>
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Loading tasks…" />
                                  }
                                >
                                  <WardTasks />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/ward"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["WARD_OFFICER"]}>
                                <Suspense fallback={<RouteLoader />}>
                                  <WardManagement />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Maintenance */}
                        <Route
                          path="/maintenance"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={["MAINTENANCE_TEAM"]}
                              >
                                <Suspense fallback={<RouteLoader />}>
                                  <MaintenanceTasks />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/tasks/:id"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={["MAINTENANCE_TEAM"]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Loading task…" />
                                  }
                                >
                                  <TaskDetails />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Communication */}
                        <Route
                          path="/messages"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening messages…" />
                                  }
                                >
                                  <Messages />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Reports */}
                        <Route
                          path="/reports"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "WARD_OFFICER",
                                  "ADMINISTRATOR",
                                  "MAINTENANCE_TEAM",
                                ]}
                              >
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Loading reports…" />
                                  }
                                >
                                  <UnifiedReports />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Admin */}
                        <Route
                          path="/admin/users"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["ADMINISTRATOR"]}>
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening users…" />
                                  }
                                >
                                  <AdminUsers />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/admin/config"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["ADMINISTRATOR"]}>
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening config…" />
                                  }
                                >
                                  <AdminConfig />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/admin/languages"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["ADMINISTRATOR"]}>
                                <Suspense
                                  fallback={
                                    <RouteLoader label="Opening languages…" />
                                  }
                                >
                                  <AdminLanguages />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/admin/analytics"
                          element={<Navigate to="/reports" replace />}
                        />
                        <Route
                          path="/admin/reports-analytics"
                          element={<Navigate to="/reports" replace />}
                        />

                        {/* Profile & Settings */}
                        <Route
                          path="/profile"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense fallback={<RouteLoader />}>
                                  <Profile />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={[
                                  "CITIZEN",
                                  "WARD_OFFICER",
                                  "MAINTENANCE_TEAM",
                                  "ADMINISTRATOR",
                                ]}
                              >
                                <Suspense fallback={<RouteLoader />}>
                                  <Settings />
                                </Suspense>
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </div>

                    {/* Global UI outside route Suspense */}
                    <Toaster />
                    <GlobalMessageHandler />
                    <AuthErrorHandler />
                  </Router>
                </TooltipProvider>
              </OtpProvider>
            </AppInitializer>
          </SystemConfigProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;
