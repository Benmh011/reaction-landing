import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const request = await prisma.demoRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  await prisma.demoRequest.update({
    where: { id: params.id },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewedBy: session.user.email },
  });

  return NextResponse.json({ ok: true });
}
