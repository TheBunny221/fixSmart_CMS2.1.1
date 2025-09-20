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

// Lazy load components for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

// Role-specific dashboards
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard"));
const WardOfficerDashboard = lazy(() => import("./pages/WardOfficerDashboard"));
const MaintenanceDashboard = lazy(() => import("./pages/MaintenanceDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Complaint management
const ComplaintsList = lazy(() => import("./pages/ComplaintsList"));
const ComplaintDetails = lazy(() => import("./pages/ComplaintDetails"));
const CreateComplaint = lazy(() => import("./pages/CreateComplaint"));
const CitizenComplaintForm = lazy(() => import("./pages/CitizenComplaintForm"));
const GuestComplaintForm = lazy(() => import("./pages/GuestComplaintForm"));
const UnifiedComplaintForm = lazy(() => import("./pages/UnifiedComplaintForm"));
const QuickComplaintPage = lazy(() => import("./pages/QuickComplaintPage"));
const GuestTrackComplaint = lazy(() => import("./pages/GuestTrackComplaint"));
const GuestServiceRequest = lazy(() => import("./pages/GuestServiceRequest"));
const GuestDashboard = lazy(() => import("./pages/GuestDashboard"));

// Ward Officer pages
const WardTasks = lazy(() => import("./pages/WardTasks"));
const WardManagement = lazy(() => import("./pages/WardManagement"));

// Maintenance Team pages
const MaintenanceTasks = lazy(() => import("./pages/MaintenanceTasks"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));

// Admin pages
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const UnifiedReports = lazy(() => import("./pages/UnifiedReports"));
const AdminConfig = lazy(() => import("./pages/AdminConfig"));
const AdminLanguages = lazy(() => import("./pages/AdminLanguages"));

// Communication
const Messages = lazy(() => import("./pages/Messages"));

// Settings
const Settings = lazy(() => import("./pages/Settings"));

// Loading component
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex items-center space-x-2">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span>Loading...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <SystemConfigProvider>
          <AppInitializer>
            <OtpProvider>
              <TooltipProvider>
                <Router>
                  <div className="min-h-screen bg-gray-50">
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                          path="/set-password/:token"
                          element={<SetPassword />}
                        />
                        <Route
                          path="/guest/complaint"
                          element={<GuestComplaintForm />}
                        />
                        <Route
                          path="/complaint"
                          element={<QuickComplaintPage />}
                        />
                        <Route
                          path="/guest/track"
                          element={<GuestTrackComplaint />}
                        />
                        <Route
                          path="/guest/service-request"
                          element={<GuestServiceRequest />}
                        />
                        <Route
                          path="/guest/dashboard"
                          element={<GuestDashboard />}
                        />
                        <Route
                          path="/unauthorized"
                          element={<Unauthorized />}
                        />

                        {/* Protected and Public Routes */}
                        {/* Home route */}
                        <Route
                          path="/"
                          element={
                            <UnifiedLayout>
                              <Index />
                            </UnifiedLayout>
                          }
                        />

                        {/* Dashboard routes - Unified role-based routing */}
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
                                <RoleBasedDashboard />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Complaint routes */}
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
                                <ComplaintsList />
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
                                <CreateComplaint />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaints/citizen-form"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["CITIZEN"]}>
                                <QuickComplaintPage />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/complaints/new"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["CITIZEN"]}>
                                <QuickComplaintPage />
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
                                <ComplaintDetails />
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
                                <ComplaintDetails />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Ward Officer routes */}
                        <Route
                          path="/tasks"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["WARD_OFFICER"]}>
                                <WardTasks />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/ward"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["WARD_OFFICER"]}>
                                <WardManagement />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Maintenance Team routes */}
                        <Route
                          path="/maintenance"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute
                                allowedRoles={["MAINTENANCE_TEAM"]}
                              >
                                <MaintenanceTasks />
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
                                <TaskDetails />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Communication routes */}
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
                                <Messages />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Unified Reports route */}
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
                                <UnifiedReports />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Admin routes */}
                        <Route
                          path="/admin/users"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["ADMINISTRATOR"]}>
                                <AdminUsers />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/admin/config"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["ADMINISTRATOR"]}>
                                <AdminConfig />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        <Route
                          path="/admin/languages"
                          element={
                            <UnifiedLayout>
                              <RoleBasedRoute allowedRoles={["ADMINISTRATOR"]}>
                                <AdminLanguages />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />
                        {/* Redirect old analytics routes to unified reports */}
                        <Route
                          path="/admin/analytics"
                          element={<Navigate to="/reports" replace />}
                        />
                        <Route
                          path="/admin/reports-analytics"
                          element={<Navigate to="/reports" replace />}
                        />

                        {/* Profile and Settings */}
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
                                <Profile />
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
                                <Settings />
                              </RoleBasedRoute>
                            </UnifiedLayout>
                          }
                        />

                        {/* Catch all route */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </div>
                  <Toaster />
                  <GlobalMessageHandler />
                  <AuthErrorHandler />
                </Router>
              </TooltipProvider>
            </OtpProvider>
          </AppInitializer>
        </SystemConfigProvider>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;
