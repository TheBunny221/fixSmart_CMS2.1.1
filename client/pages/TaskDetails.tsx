import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useGetComplaintQuery, useUpdateComplaintStatusMutation } from "../store/api/complaintsApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Camera,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Phone,
  User,
  Wrench,
  FileText,
  Upload,
  Image,
  Download,
  File,
} from "lucide-react";
import PhotoUploadModal from "../components/PhotoUploadModal";

const TaskDetails: React.FC = () => {
  const { id } = useParams();
  const { user } = useAppSelector((state) => state.auth);
  const [workNote, setWorkNote] = useState("");
  const [completionNote, setCompletionNote] = useState("");

  const isMaintenanceTeam = user?.role === "MAINTENANCE_TEAM";

  // Fetch complaint dynamically
  const {
    data: complaintResponse,
    isLoading: complaintLoading,
    error: complaintError,
    refetch: refetchComplaint,
  } = useGetComplaintQuery(id ?? "");

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [updateComplaintStatus] = useUpdateComplaintStatusMutation();

  const raw = complaintResponse?.data?.complaint;

  const addWorkUpdate = async () => {
    if (!task) return;
    if (!workNote || workNote.trim().length === 0) return;
    try {
      setIsAddingLog(true);
      await updateComplaintStatus({ id: task.id, status: "IN_PROGRESS", remarks: workNote.trim() }).unwrap();
      setWorkNote("");
      // refresh complaint to show new status log
      refetchComplaint?.();
    } catch (err) {
      console.error("Failed to add work log:", err);
    } finally {
      setIsAddingLog(false);
    }
  };

  const task = useMemo(() => {
    if (!raw) return null;

    const latLng = (() => {
      let lat = raw.latitude;
      let lng = raw.longitude;
      if ((!lat || !lng) && raw.coordinates) {
        try {
          const c = typeof raw.coordinates === "string" ? JSON.parse(raw.coordinates) : raw.coordinates;
          lat = c?.latitude ?? c?.lat ?? lat;
          lng = c?.longitude ?? c?.lng ?? lng;
        } catch {
          // ignore
        }
      }
      return { lat, lng };
    })();

    return {
      id: raw.id,
      complaintId: raw.complaintId,
      title: raw.title || (raw.type ? `${raw.type} Issue` : "Task"),
      description: raw.description,
      location: raw.area || raw.address || raw.location || "",
      coordinates: `${latLng.lat || ""}, ${latLng.lng || ""}`,
      priority: raw.priority || "MEDIUM",
      status: raw.status,
      estimatedTime: raw.estimatedTime || null,
      dueDate: raw.deadline ? new Date(raw.deadline).toISOString().split("T")[0] : null,
      assignedDate: raw.assignedOn || raw.submittedOn,
      submittedBy: raw.submittedBy?.fullName || raw.submittedBy || "",
      contactPhone: raw.contactPhone || raw.mobile || "",
      materials: raw.materials || [],
      tools: raw.tools || [],
      workLog: (raw.statusLogs || []).map((s: any) => ({
        time: s.timestamp,
        note: s.comment || `${s.toStatus}`,
        photo: false,
        user: s.user,
      })),
      attachments: [
        ...(raw.attachments || []),
        ...((raw.photos || []).map((p: any) => ({
          id: p.id,
          fileName: p.fileName || p.originalName || p.photoUrl?.split('/').pop(),
          mimeType: p.mimeType,
          uploadedAt: p.uploadedAt,
          url: p.photoUrl || p.photoUrl || p.url,
          description: p.description || null,
          uploadedBy: p.uploadedByTeam?.fullName || null,
        })) || []),
      ],
    } as any;
  }, [raw]);

  if (complaintLoading) {
    return <div>Loading task...</div>;
  }

  if (complaintError || !task) {
    return (
      <div className="space-y-6">
        <p className="text-red-600">Failed to load task details.</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Link to="/maintenance">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tasks
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Task #{task.complaintId || task.id}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority} Priority
            </Badge>
            <span className="text-sm text-gray-500">Due: {task.dueDate}</span>
          </div>
        </div>
        {!isMaintenanceTeam && (
          <div className="flex space-x-2">
            <Button variant="outline">
              <Navigation className="h-4 w-4 mr-2" />
              Navigate
            </Button>
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call Contact
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                Task Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Title</h3>
                <p className="text-gray-900">{task.title}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-gray-600">{task.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Location
                  </h3>
                  <p className="text-gray-600">{task.location}</p>
                  <p className="text-sm text-gray-500">{task.coordinates}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Timeline
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">
                      Assigned: {task.assignedDate}
                    </p>
                    <p className="text-gray-600">Due: {task.dueDate}</p>
                    <p className="text-gray-600">
                      Est. Time: {task.estimatedTime}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Log - visible only to Admin, Ward Officer, Maintenance Team */}
          {(["ADMINISTRATOR","WARD_OFFICER","MAINTENANCE_TEAM"].includes(user?.role)) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Work Progress Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.workLog.map((log, index) => (
                    <div
                      key={`log-${index}`}
                      className="border-l-4 border-blue-500 pl-4 py-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{new Date(log.time).toLocaleString ? new Date(log.time).toLocaleString() : log.time}</p>
                          <p className="text-sm text-gray-600">{log.note}</p>
                          {log.photo && (
                            <Badge variant="secondary" className="mt-1">
                              📷 Photo Attached
                            </Badge>
                          )}

                          {/* Attachments inline for log entries if any reference (mock not linking here) */}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Render image attachments as part of the work log so uploads appear immediately */}
                  {task.attachments && task.attachments.filter((a: any) => a.mimeType?.startsWith("image/")).length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-2">Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {task.attachments.filter((a: any) => a.mimeType?.startsWith("image/")).map((att: any) => (
                          <div key={att.id} className="border rounded p-2">
                            <img src={att.url} alt={att.fileName || att.originalName} className="w-full h-28 object-cover rounded mb-2" />
                            <div className="text-xs text-gray-600">{att.fileName || att.originalName}</div>
                            {att.description && (
                              <div className="text-sm text-gray-700 mt-1">{att.description}</div>
                            )}
                            {att.uploadedBy && (
                              <div className="text-xs text-gray-500 mt-1">Uploaded by: {att.uploadedBy}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">{new Date(att.uploadedAt).toLocaleString()}</div>
                            <div className="mt-2">
                              <a href={att.url} download className="inline-flex items-center">
                                <Button size="xs">Download</Button>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add New Log Entry */}
                <div className="mt-6 pt-4 border-t">
                  <Label htmlFor="workNote">Add Work Update</Label>
                  <div className="flex space-x-2 mt-2">
                    <Textarea
                      id="workNote"
                      value={workNote}
                      onChange={(e) => setWorkNote(e.target.value)}
                      placeholder="Describe current work status..."
                      className="flex-1"
                      rows={2}
                    />
                    <div className="flex flex-col space-y-2">
                      <Button size="sm" onClick={() => setIsPhotoModalOpen(true)}>
                      <Camera className="h-4 w-4 mr-1" />
                      Photo
                    </Button>
                      <Button size="sm" variant="outline" onClick={addWorkUpdate} disabled={isAddingLog || !workNote.trim()}>
                        {isAddingLog ? "Adding..." : "Add Log"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Attachments listed here as well (visible to same roles) */}
                <div className="mt-6 pt-4 border-t">
                  <h3 className="font-medium mb-3 flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Attachments
                  </h3>
                  <div className="space-y-3">
                    {task.attachments.map((att) => {
                      const isImage = att.mimeType.startsWith("image/");
                      const canDownload = ["ADMINISTRATOR","WARD_OFFICER","MAINTENANCE_TEAM"].includes(user?.role);
                      return (
                        <div key={att.id} className="flex items-center justify-between border rounded p-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 grid place-items-center rounded bg-gray-100">
                              {isImage ? <Image className="h-5 w-5" /> : <File className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="font-medium">{att.fileName}</div>
                              {att.description && <div className="text-sm text-gray-700">{att.description}</div>}
                              {att.uploadedBy && <div className="text-xs text-gray-500">Uploaded by: {att.uploadedBy}</div>}
                              <div className="text-xs text-gray-500">{att.mimeType} • {new Date(att.uploadedAt).toLocaleString()}</div>
                            </div>
                          </div>
                          <div>
                            {canDownload ? (
                              <a href={att.url} download className="inline-flex items-center">
                                <Button size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </a>
                            ) : (
                              <Button size="sm" disabled>
                                <Download className="h-4 w-4 mr-2" />
                                Restricted
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Form */}

          <PhotoUploadModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            complaintId={task?.id}
            onSuccess={() => {
              // refresh complaint data to show new photos
              refetchComplaint?.();
            }}
          />
          {task.status === "IN_PROGRESS" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Mark Task Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="completionNote">Completion Notes</Label>
                  <Textarea
                    id="completionNote"
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    placeholder="Describe the work completed, any issues resolved, and follow-up actions needed..."
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Task
                  </Button>
                  <Button variant="outline" onClick={() => setIsPhotoModalOpen(true)}>
                    <Camera className="h-4 w-4 mr-2" />
                    Add Completion Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Assigned By</p>
                <p className="text-gray-600">
                  {typeof task.submittedBy === "object" && task.submittedBy
                    ? task.submittedBy.fullName ||
                      task.submittedBy.name ||
                      "Unknown"
                    : task.submittedBy}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Contact Phone</p>
                <div className="flex items-center space-x-2">
                  <p className="text-gray-600">{task.contactPhone}</p>
                  <Button size="sm" variant="outline">
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Materials - Hidden for Maintenance Team */}
          {!isMaintenanceTeam && (
            <Card>
              <CardHeader>
                <CardTitle>Required Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.materials.map((material, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{material}</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Tools - Hidden for Maintenance Team */}
          {!isMaintenanceTeam && (
            <Card>
              <CardHeader>
                <CardTitle>Required Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.tools.map((tool, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{tool}</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions - Hidden for Maintenance Team */}
          {!isMaintenanceTeam && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Issue
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
