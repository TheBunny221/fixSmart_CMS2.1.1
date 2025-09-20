import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
} from "lucide-react";

interface ComplaintQuickActionsProps {
  complaint: {
    id: string;
    complaintId?: string;
    status: string;
    priority: string;
    type: string;
    description: string;
    area: string;
    assignedTo?: { id: string; fullName: string } | null;
  };
  userRole: string;
  showDetails?: boolean;
  onUpdate?: () => void;
  onShowUpdateModal?: (complaint: any) => void;
}

const ComplaintQuickActions: React.FC<ComplaintQuickActionsProps> = ({
  complaint,
  userRole,
  showDetails = true,
  onUpdate,
  onShowUpdateModal,
}) => {
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

  const canManageComplaint =
    userRole === "WARD_OFFICER" || userRole === "ADMINISTRATOR";
  const canAssign = userRole === "WARD_OFFICER" || userRole === "ADMINISTRATOR";
  const isMaintenanceTeam = userRole === "MAINTENANCE_TEAM";

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Quick Status Indicator */}
        {showDetails && (
          <div className="flex flex-col gap-1">
            <Badge
              className={getStatusColor(complaint.status)}
              variant="secondary"
            >
              {complaint.status.replace("_", " ")}
            </Badge>
            <Badge
              className={getPriorityColor(complaint.priority)}
              variant="outline"
            >
              {complaint.priority}
            </Badge>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {/* View Details */}
          {
            (() => {
              const to = isMaintenanceTeam
                ? `/tasks/${complaint.complaintId || complaint.id}`
                : `/complaints/${complaint.id}`;
              return (
                <Link to={to}>
                  <Button size="sm" variant="outline" title="View Details">
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
              );
            })()
          }

          {/* Quick Status Change Buttons for Ward Officers */}
          {canManageComplaint && (
            <>
              {complaint.status === "REGISTERED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onShowUpdateModal?.(complaint)}
                  title="Assign Complaint"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <UserPlus className="h-3 w-3" />
                </Button>
              )}

              {complaint.status === "ASSIGNED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onShowUpdateModal?.(complaint)}
                  title="Start Progress"
                  className="text-orange-600 hover:text-orange-700"
                >
                  <Clock className="h-3 w-3" />
                </Button>
              )}

              {complaint.status === "IN_PROGRESS" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onShowUpdateModal?.(complaint)}
                  title="Mark Resolved"
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-3 w-3" />
                </Button>
              )}
            </>
          )}

          {/* Maintenance Team Actions */}
          {isMaintenanceTeam && (
            <>
              {complaint.status === "ASSIGNED" && (
                <Button
                  size="sm"
                  onClick={() => onShowUpdateModal?.(complaint)}
                  title="Start Work"
                  className="text-orange-600 hover:text-orange-700"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Start
                </Button>
              )}

              {complaint.status === "IN_PROGRESS" && (
                <Button
                  size="sm"
                  onClick={() => onShowUpdateModal?.(complaint)}
                  title="Mark Resolved"
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Button>
              )}
            </>
          )}

          {/* More Actions Dropdown */}
          {(canManageComplaint || isMaintenanceTeam) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onShowUpdateModal && canManageComplaint && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onShowUpdateModal(complaint)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Complaint
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {onShowUpdateModal && isMaintenanceTeam && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onShowUpdateModal(complaint)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Status
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link to={isMaintenanceTeam ? `/tasks/${complaint.complaintId || complaint.id}` : `/complaints/${complaint.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Full Details
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </>
  );
};

export default ComplaintQuickActions;
