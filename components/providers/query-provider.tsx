"use client";

import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/app/get-query-client";
import dynamic from "next/dynamic";

// Development-only Devtools lazy-loaded so they do NOT bloat production bundle (Rule 59)
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then((d) => ({
            default: d.ReactQueryDevtools,
          })),
        { ssr: false }
      )
    : () => null;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use state or getQueryClient() to ensure client persistence in React 18
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
