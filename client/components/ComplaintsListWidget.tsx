import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useGetComplaintsQuery } from "../store/api/complaintsApi";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  FileText,
  Calendar,
  MapPin,
  Eye,
  RefreshCw,
  Users,
  UserCheck,
} from "lucide-react";

import ComplaintQuickActions from "./ComplaintQuickActions";
import UpdateComplaintModal from "./UpdateComplaintModal";

interface ComplaintsListWidgetProps {
  filters: any;
  title?: string;
  maxHeight?: string;
  showActions?: boolean;
  onComplaintUpdate?: () => void;
  userRole?: string;
  user?: any;
}

const ComplaintsListWidget: React.FC<ComplaintsListWidgetProps> = ({
  filters,
  title = "Complaints",
  maxHeight = "400px",
  showActions = true,
  onComplaintUpdate,
  userRole,
  user,
}) => {
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Use provided user or fall back to current user from store
  const effectiveUser = user || currentUser;
  const effectiveUserRole = userRole || effectiveUser?.role;

  // Build query params with ward filtering for Ward Officers
  const queryParams = useMemo(() => {
    const params = {
      ...filters,
      page: 1,
      limit: 50,
    };

    // Enforce officer-based filtering for Ward Officers
    if (effectiveUserRole === "WARD_OFFICER" && effectiveUser?.id) {
      params.officerId = effectiveUser.id;
    }

    return params;
  }, [filters, effectiveUserRole, effectiveUser?.id]);

  const {
    data: complaintsResponse,
    isLoading,
    error,
    refetch,
  } = useGetComplaintsQuery(queryParams);

  // Handle different response structures
  const complaints = Array.isArray(complaintsResponse?.data?.complaints)
    ? complaintsResponse.data.complaints
    : Array.isArray(complaintsResponse?.data)
      ? complaintsResponse.data
      : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REGISTERED":
        return "bg-yellow-100 text-yellow-800";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
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

  // Get team assignment status based on maintenanceTeamId
  const getTeamAssignmentStatus = (complaint: any) => {
    if (complaint.maintenanceTeamId) {
      return {
        status: "Assigned",
        color: "bg-green-100 text-green-800",
        teamMember:
          complaint.maintenanceTeam?.fullName || "Unknown Team Member",
      };
    } else {
      return {
        status: "Needs Assignment",
        color: "bg-orange-100 text-orange-800",
        teamMember: null,
      };
    }
  };

  const hasFilters = Object.keys(filters).some(
    (key) =>
      filters[key] !== undefined &&
      filters[key] !== null &&
      filters[key] !== "" &&
      !(Array.isArray(filters[key]) && filters[key].length === 0),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {title} (
            {complaintsResponse?.data?.pagination?.totalItems ??
              complaints.length}
            )
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-red-400 mb-4" />
            <p className="text-red-500 mb-2">Failed to load complaints</p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">No complaints found</p>
            <p className="text-sm text-gray-400">
              {hasFilters
                ? "No complaints match the selected filters"
                : "No complaints available"}
            </p>
          </div>
        ) : (
          <div style={{ maxHeight, overflowY: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  {/* {effectiveUserRole === "WARD_OFFICER" && (
                    <TableHead>Team Assignment</TableHead>
                  )} */}
                  {effectiveUserRole === "WARD_OFFICER" && (
                    <TableHead>Team </TableHead>
                  )}
                  {effectiveUserRole !== "WARD_OFFICER" && (
                    <TableHead>Rating</TableHead>
                  )}
                  {effectiveUserRole !== "WARD_OFFICER" && (
                    <TableHead>SLA</TableHead>
                  )}
                  {effectiveUserRole !== "WARD_OFFICER" && (
                    <TableHead>Closed</TableHead>
                  )}
                  <TableHead>Updated</TableHead>
                  <TableHead>Date</TableHead>
                  {showActions && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">
                      #{complaint.complaintId || complaint.id.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="truncate" title={complaint.description}>
                          {complaint.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {complaint.type?.replace("_", " ") || "N/A"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-1" />
                        {complaint.area || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(complaint.status)}>
                        {complaint.status?.replace("_", " ") || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(complaint.priority)}>
                        {complaint.priority || "N/A"}
                      </Badge>
                    </TableCell>
                    {effectiveUserRole === "WARD_OFFICER" && (
                      <>
                        {/* <TableCell>
                          {(() => {
                            const assignment =
                              getTeamAssignmentStatus(complaint);
                            return (
                              <Badge className={assignment.color}>
                                {assignment.status}
                              </Badge>
                            );
                          })()}
                        </TableCell> */}
                        <TableCell>
                          {(() => {
                            const assignment =
                              getTeamAssignmentStatus(complaint);
                            return assignment.teamMember ? (
                              <div className="flex items-center text-sm width-fit-content">
                                <UserCheck className="h-3 w-3 mr-1" />
                                {assignment.teamMember}
                              </div>
                            ) : (
                              <div className="flex items-center text-sm text-gray-500">
                                <Users className="h-3 w-3 mr-1" />
                                Not assigned
                              </div>
                            );
                          })()}
                        </TableCell>
                      </>
                    )}
                    {effectiveUserRole !== "WARD_OFFICER" && (
                      <>
                        <TableCell>
                          {typeof complaint.rating === "number" &&
                          complaint.rating > 0 ? (
                            <span className="text-sm font-medium">
                              {complaint.rating}/5
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              (complaint.slaStatus === "OVERDUE" &&
                                "bg-red-100 text-red-800") ||
                              (complaint.slaStatus === "WARNING" &&
                                "bg-yellow-100 text-yellow-800") ||
                              (complaint.slaStatus === "ON_TIME" &&
                                "bg-green-100 text-green-800") ||
                              "bg-gray-100 text-gray-800"
                            }
                          >
                            {complaint.slaStatus?.replace("_", " ") || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {complaint.closedOn ? (
                            <span className="text-sm">
                              {new Date(
                                complaint.closedOn,
                              ).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      {complaint.updatedAt ? (
                        <span className="text-sm">
                          {new Date(complaint.updatedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        {complaint.submittedOn
                          ? new Date(complaint.submittedOn).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ComplaintQuickActions
                            complaint={{
                              id: complaint.id,
                              complaintId: complaint.complaintId,
                              status: complaint.status,
                              priority: complaint.priority,
                              type: complaint.type,
                              description: complaint.description,
                              area: complaint.area,
                              assignedTo: complaint.assignedTo,
                            }}
                            userRole={effectiveUserRole || "WARD_OFFICER"}
                            showDetails={false}
                            onUpdate={() => {
                              refetch();
                              onComplaintUpdate?.();
                            }}
                            onShowUpdateModal={() => {
                              setSelectedComplaint(complaint);
                              setIsUpdateModalOpen(true);
                            }}
                          />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {/* Update Complaint Modal */}
      <UpdateComplaintModal
        complaint={selectedComplaint}
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedComplaint(null);
        }}
        onSuccess={() => {
          setIsUpdateModalOpen(false);
          setSelectedComplaint(null);
          refetch();
          onComplaintUpdate?.();
        }}
      />
    </Card>
  );
};

export default ComplaintsListWidget;
