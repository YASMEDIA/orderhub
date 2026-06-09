import { prisma } from "./prisma";

// Append an audit-log entry. Never throws into the caller's flow.
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  detail?: string;
  projectId?: string | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        detail: params.detail,
        projectId: params.projectId ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write activity log", err);
  }
}
