"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/users");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingState label="Redirecionando para Usuários do Sistema..." />
    </div>
  );
}
