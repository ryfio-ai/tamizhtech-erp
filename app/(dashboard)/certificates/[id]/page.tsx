import React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCertificateById } from "@/lib/certificateService";
import { CertificateDetailView } from "@/components/certificates/CertificateDetailView";

export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CertificateDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const cert = await getCertificateById(params.id);
  if (!cert) {
    notFound();
  }

  const userRole = (session.user as any).role || "ADMIN";

  return <CertificateDetailView certificate={cert} userRole={userRole} />;
}
