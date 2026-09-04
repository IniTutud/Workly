export type TaskStatus =
  | "assigned"
  | "waiting_review"
  | "revision"
  | "approved";

export type SubmissionStatus =
  | "submitted"
  | "approved"
  | "revision";

export const isTaskOverdue = (
  status: TaskStatus,
  dueDate: string
): boolean => {
  const today = new Date().toISOString().split("T")[0];

  return (
    dueDate < today &&
    (status === "assigned" || status === "revision")
  );
};

export const isSubmissionLate = (
  submittedAt: string,
  dueDate: string
): boolean => {
  const submittedDate = new Date(submittedAt)
    .toISOString()
    .split("T")[0];

  return submittedDate > dueDate;
};

export const getTaskDisplayStatus = (
  status: TaskStatus,
  dueDate: string
) => {
  if (isTaskOverdue(status, dueDate)) {
    return {
      label: "Overdue",
      className: "bg-red-100 text-red-600",
    };
  }

  switch (status) {
    case "assigned":
      return {
        label: "Assigned",
        className: "bg-blue-100 text-blue-600",
      };

    case "waiting_review":
      return {
        label: "Waiting Review",
        className: "bg-yellow-100 text-yellow-600",
      };

    case "revision":
      return {
        label: "Revision",
        className: "bg-orange-100 text-orange-600",
      };

    case "approved":
      return {
        label: "Approved",
        className: "bg-green-100 text-green-600",
      };

    default:
      return {
        label: status,
        className: "bg-gray-100 text-gray-600",
      };
  }
};