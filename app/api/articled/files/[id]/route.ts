import { NextRequest, NextResponse } from "next/server";
import { articledGate } from "@/lib/articled/gate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";


export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await articledGate();
  if (!email) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.articledChatFile.findUnique({ where: { id } });
  // Only the person who created it (within their own conversation) may fetch it.
  if (!file || file.userId !== email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = new Uint8Array(file.data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
