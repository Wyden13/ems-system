import { api } from "./client";
import type { AssignmentCandidate, AssignmentPreview } from "./workflows";

export const previewKey = (candidate: AssignmentCandidate) => [
  "schedule",
  "assignment-preview",
  candidate,
];
export const checkAssignment = (
  candidate: AssignmentCandidate,
  signal?: AbortSignal,
) =>
  api<AssignmentPreview>("/api/shifts/assignment-preview", {
    method: "POST",
    body: JSON.stringify(candidate),
    signal,
  });
