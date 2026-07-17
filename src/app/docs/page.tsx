"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import spec from "../../../docs/openapi/spec.json";

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">BMS Dashboard API</h1>
        <p className="mb-6 text-muted-foreground">
          Interactive API documentation. Use the{" "}
          <strong>Try it out</strong> button to test endpoints directly.
        </p>
        <div className="rounded-lg border bg-card shadow-sm dark:bg-gray-900">
          <SwaggerUI
            spec={spec as Record<string, unknown>}
            displayRequestDuration={true}
            defaultModelsExpandDepth={1}
            docExpansion="list"
          />
        </div>
      </div>
    </div>
  );
}
