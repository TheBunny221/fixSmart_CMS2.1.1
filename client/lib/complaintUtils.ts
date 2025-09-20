export type ComplaintStatus =
  | "registered"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "reopened";

export type ComplaintPriority = "low" | "medium" | "high" | "critical";

export const getComplaintTypeLabel = (type: string): string => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const isResolved = (status: ComplaintStatus): boolean => {
  return ["resolved", "closed"].includes(status);
};

export const isPending = (status: ComplaintStatus): boolean => {
  return ["registered", "assigned", "in_progress", "reopened"].includes(status);
};

export const getStatusColor = (status: ComplaintStatus): string => {
  const statusColors: Record<ComplaintStatus, string> = {
    registered: "bg-status-registered text-foreground",
    assigned: "bg-status-assigned text-foreground",
    in_progress: "bg-status-progress text-foreground",
    resolved: "bg-status-resolved text-foreground",
    closed: "bg-status-closed text-foreground",
    reopened: "bg-status-reopened text-foreground",
  };

  return statusColors[status] || "bg-muted text-foreground";
};

export const getPriorityColor = (priority: ComplaintPriority): string => {
  const priorityColors: Record<ComplaintPriority, string> = {
    low: "bg-muted text-foreground",
    medium: "bg-secondary text-secondary-foreground",
    high: "bg-accent text-accent-foreground",
    critical: "bg-destructive text-destructive-foreground",
  };

  return priorityColors[priority] || "bg-muted text-foreground";
};

export const getStatusLabel = (status: ComplaintStatus): string => {
  const statusLabels: Record<ComplaintStatus, string> = {
    registered: "Registered",
    assigned: "Assigned",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    reopened: "Reopened",
  };

  return statusLabels[status] || status;
};

export const getPriorityLabel = (priority: ComplaintPriority): string => {
  const priorityLabels: Record<ComplaintPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  };

  return priorityLabels[priority] || priority;
};

export const calculateSLAStatus = (
  submittedDate: string,
  slaHours: number,
  status: ComplaintStatus,
): "ontime" | "warning" | "overdue" | "completed" => {
  if (isResolved(status)) {
    return "completed";
  }

  const submitted = new Date(submittedDate);
  const now = new Date();
  const hoursElapsed = (now.getTime() - submitted.getTime()) / (1000 * 60 * 60);

  if (hoursElapsed > slaHours) {
    return "overdue";
  } else if (hoursElapsed > slaHours * 0.8) {
    return "warning";
  } else {
    return "ontime";
  }
};

export const getSLAStatusColor = (slaStatus: string): string => {
  const slaColors: Record<string, string> = {
    ontime: "bg-status-resolved text-foreground",
    warning: "bg-status-progress text-foreground",
    overdue: "bg-destructive text-destructive-foreground",
    completed: "bg-status-assigned text-foreground",
  };

  return slaColors[slaStatus] || "bg-muted text-foreground";
};
