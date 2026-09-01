import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readUploadedDocument, contentTypeFor } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { certId } = await params;
  const cert = await prisma.certificate.findFirst({
    where: { id: certId, companyId: user.companyId },
  });
  if (!cert || !cert.documentPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = cert.documentPath.split(".").pop() || "";
  let bytes: Buffer;
  try {
    bytes = await readUploadedDocument(cert.documentPath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeFor(ext),
      "Content-Disposition": `inline; filename="${(cert.documentName || "document").replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
