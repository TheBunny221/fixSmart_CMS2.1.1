import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import {
  useGetComplaintsQuery,
  useUpdateComplaintStatusMutation,
} from "../store/api/complaintsApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Camera,
  FileText,
  BarChart3,
  TrendingUp,
  Navigation,
  Phone,
  MessageSquare,
} from "lucide-react";

const MaintenanceDashboard: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { translations } = useAppSelector((state) => state.language);

  // Fetch complaints assigned to this maintenance team member
  // Let the backend handle role-based filtering automatically for maintenance team
  const {
    data: complaintsResponse,
    isLoading,
    error,
    refetch: refetchComplaints,
  } = useGetComplaintsQuery({
    page: 1,
    limit: 100,
  });

  const complaints = useMemo(() => {
    if (Array.isArray(complaintsResponse?.data?.complaints)) {
      return complaintsResponse!.data!.complaints;
    }
    if (Array.isArray((complaintsResponse as any)?.data)) {
      return (complaintsResponse as any).data;
    }
    return [] as any[];
  }, [complaintsResponse]);

  const [updateComplaintStatus] = useUpdateComplaintStatusMutation();

  const dashboardStats = useMemo(() => {
    const assignedTasks = complaints.filter((c: any) => {
      const assigneeId = c.assignedToId || c.assignedTo?.id || c.assignedTo;
      const maintenanceTeamId = c.maintenanceTeamId || c.maintenanceTeam?.id;
      return (
        (assigneeId === user?.id || maintenanceTeamId === user?.id) &&
        c.status !== "REGISTERED"
      );
    });

    //   useEffect(() => {
    //     // Filter tasks assigned to this maintenance team member
    //     const assignedTasks = complaints.filter(
    //       (c) => c.assignedToId === user?.id && c.status !== "REGISTERED",
    //     );
    //     const assignedTasks = complaints.filter(
    //       (c) => c.assignedToId === user?.id && c.status !== "REGISTERED",
    //     );

    const totalTasks = assignedTasks.length;
    const inProgress = assignedTasks.filter(
      (c) => c.status === "IN_PROGRESS",
    ).length;
    const completed = assignedTasks.filter(
      (c) => c.status === "RESOLVED",
    ).length;
    const pending = assignedTasks.filter((c) => c.status === "ASSIGNED").length;

    const today = new Date().toDateString();
    const todayTasks = assignedTasks.filter(
      (c) => new Date(c.assignedOn || c.submittedOn).toDateString() === today,
    ).length;

    // Calculate average completion time for resolved tasks
    const resolvedTasks = assignedTasks.filter(
      (c) => c.status === "RESOLVED" && c.resolvedOn && c.assignedOn,
    );
    const avgCompletionTime =
      resolvedTasks.length > 0
        ? resolvedTasks.reduce((acc, task) => {
            const assignedDate = new Date(task.assignedOn);
            const resolvedDate = new Date(task.resolvedOn);
            const diffInDays =
              (resolvedDate.getTime() - assignedDate.getTime()) /
              (1000 * 60 * 60 * 24);
            return acc + diffInDays;
          }, 0) / resolvedTasks.length
        : 0;

    // Calculate efficiency as percentage of tasks completed on time
    const tasksWithDeadlines = assignedTasks.filter((c) => c.deadline);
    const onTimeTasks = tasksWithDeadlines.filter((c) => {
      if (c.status === "RESOLVED" && c.resolvedOn) {
        return new Date(c.resolvedOn) <= new Date(c.deadline);
      }
      return c.status !== "RESOLVED" && new Date() <= new Date(c.deadline);
    });
    const efficiency =
      tasksWithDeadlines.length > 0
        ? Math.round((onTimeTasks.length / tasksWithDeadlines.length) * 100)
        : totalTasks === 0
          ? 100
          : Math.round((completed / totalTasks) * 100);

    return {
      totalTasks,
      inProgress,
      completed,
      pending,
      todayTasks,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10, // Round to 1 decimal
      efficiency,
    };
  }, [complaints, user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const myTasks = useMemo(() => {
    return complaints.filter((c: any) => {
      const assigneeId = c.assignedToId || c.assignedTo?.id || c.assignedTo;
      const maintenanceTeamId = c.maintenanceTeamId || c.maintenanceTeam?.id;
      return (
        (assigneeId === user?.id || maintenanceTeamId === user?.id) &&
        c.status !== "REGISTERED"
      );
    });
  }, [complaints, user?.id]);

  const activeTasks = useMemo(
    () =>
      myTasks
        .filter((c) => c.status === "ASSIGNED" || c.status === "IN_PROGRESS")
        .slice(0, 5),
    [myTasks],
  );

  const urgentTasks = useMemo(
    () =>
      myTasks
        .filter((c) => c.priority === "CRITICAL" || c.priority === "HIGH")
        .slice(0, 3),
    [myTasks],
  );

  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    try {
      await updateComplaintStatus({
        id: complaintId,
        status: newStatus,
      }).unwrap();
      refetchComplaints();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            🚧 Maintenance Dashboard 🛠️
          </h1>
          <p className="text-green-100">Loading your assigned tasks...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">⚠️ Dashboard Error</h1>
          <p className="text-red-100">
            Failed to load your tasks. Please try again.
          </p>
          <div className="mt-4">
            <Button
              className="bg-white text-red-600 hover:bg-gray-100"
              onClick={() => refetchComplaints()}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">🚧 Maintenance Dashboard 🛠️</h1>
        <p className="text-green-100">
          Manage your assigned tasks and track field work progress.
        </p>
        <div className="mt-4 flex space-x-2">
          <Button className="bg-white text-green-600 hover:bg-gray-100">
            <Navigation className="h-4 w-4 mr-2" />
            Start Field Work
          </Button>
          <Button
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => refetchComplaints()}
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Debug Info - Development Only */}
      {process.env.NODE_ENV === "development" && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-800">
              Debug Info (Dev Mode)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-yellow-700">
            <div>Total Complaints Fetched: {complaints.length}</div>
            <div>User ID: {user?.id}</div>
            <div>User Role: {user?.role}</div>
            <div>My Tasks Count: {myTasks.length}</div>
            {complaints.length > 0 && (
              <div>
                Sample Task:{" "}
                {JSON.stringify(complaints[0], null, 2).substring(0, 200)}...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.totalTasks}
            </div>
            <p className="text-xs text-muted-foreground">Assigned to you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats.todayTasks}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently working on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats.efficiency}%
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">
            Active Tasks ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="urgent">
            Urgent ({urgentTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="tools">Tools & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Tasks */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Active Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                    <p className="text-gray-500">No active tasks</p>
                    <p className="text-sm text-gray-400">
                      Great job! All caught up.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-sm">
                            {task.title || `Task #${task.id.slice(-6)}`}
                          </h3>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(task.status)}>
                              {task.status.replace("_", " ")}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mb-3">
                          <MapPin className="h-3 w-3 mr-1" />
                          {task.area}, {task.landmark}
                          <Calendar className="h-3 w-3 ml-3 mr-1" />
                          Due:{" "}
                          {task.deadline
                            ? new Date(task.deadline).toLocaleDateString()
                            : "No deadline"}
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Navigation className="h-3 w-3 mr-1" />
                              Navigate
                            </Button>
                            <Button size="sm" variant="outline">
                              <Phone className="h-3 w-3 mr-1" />
                              Call Citizen
                            </Button>
                          </div>
                          <div className="flex space-x-2">
                            {task.status === "ASSIGNED" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleStatusUpdate(task.id, "IN_PROGRESS")
                                }
                              >
                                Start Work
                              </Button>
                            )}
                            {task.status === "IN_PROGRESS" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleStatusUpdate(task.id, "RESOLVED")
                                }
                              >
                                Mark Complete
                              </Button>
                            )}
                            <Link to={`/tasks/${task.id}`}>
                              <Button size="sm" variant="outline">
                                Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions & Progress */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start">
                    <Camera className="h-4 w-4 mr-2" />
                    Take Work Photo
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Supervisor
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Navigation className="h-4 w-4 mr-2" />
                    View Route Map
                  </Button>
                </CardContent>
              </Card>

              {/* Progress Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tasks Completed</span>
                      <span>
                        {dashboardStats.totalTasks > 0
                          ? Math.round(
                              (dashboardStats.completed /
                                dashboardStats.totalTasks) *
                                100,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        dashboardStats.totalTasks > 0
                          ? (dashboardStats.completed /
                              dashboardStats.totalTasks) *
                            100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dashboardStats.avgCompletionTime}
                    </div>
                    <p className="text-xs text-gray-500">
                      Avg. Completion Time (days)
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {dashboardStats.completed}
                    </div>
                    <p className="text-xs text-gray-500">
                      Tasks Completed This Month
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Urgent Tasks Requiring Immediate Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                  <p className="text-gray-500">No urgent tasks! Well done!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {urgentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm">
                          {task.title || `Task #${task.id.slice(-6)}`}
                        </h3>
                        <div className="flex space-x-2">
                          <Badge className="bg-red-100 text-red-800">
                            {task.priority}
                          </Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">
                        {task.description}
                      </p>
                      <div className="flex items-center text-xs text-gray-600 mb-3">
                        <MapPin className="h-3 w-3 mr-1" />
                        {task.area}
                        <Clock className="h-3 w-3 ml-3 mr-1" />
                        Due:{" "}
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString()
                          : "ASAP"}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Navigation className="h-3 w-3 mr-1" />
                            Navigate
                          </Button>
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3 mr-1" />
                            Emergency Contact
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="destructive">
                            Start Immediately
                          </Button>
                          <Link to={`/tasks/${task.id}`}>
                            <Button size="sm" variant="outline">
                              Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recently Completed Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myTasks
                  .filter((task) => task.status === "RESOLVED")
                  .slice(0, 10)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 bg-green-50"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-sm">
                            {task.title || `Task #${task.id.slice(-6)}`}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Completed on{" "}
                            {task.resolvedOn
                              ? new Date(task.resolvedOn).toLocaleDateString()
                              : "Recently"}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <Link to={`/tasks/${task.id}`}>
                            <Button size="sm" variant="outline">
                              View Report
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start">
                  <Camera className="h-4 w-4 mr-2" />
                  Photo Documentation
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Navigation className="h-4 w-4 mr-2" />
                  GPS Navigation
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Work Order Scanner
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Incident Reporting
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reports & Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Daily Work Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance Summary
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Time Tracking
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Completion Certificate
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaintenanceDashboard;
