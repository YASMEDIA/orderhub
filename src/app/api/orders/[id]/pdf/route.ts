import { NextResponse } from "next/server";
import { requireUser, canAccessProject } from "@/lib/rbac";
import { renderOrderReceiptPdf } from "@/lib/order-receipt";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await renderOrderReceiptPdf(id);
  if (!result) return new NextResponse("Not found", { status: 404 });
  const { pdf, order } = result;
  if (user.role === "DRIVER") return new NextResponse("Forbidden", { status: 403 }); // drivers: status only
  if (!canAccessProject(user, order.projectId)) return new NextResponse("Forbidden", { status: 403 });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.orderNumber}.pdf"`,
    },
  });
}
