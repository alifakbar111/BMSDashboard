declare module "swagger-ui-react" {
  import type { ReactElement } from "react";

  export interface SwaggerUIProps {
    spec?: Record<string, unknown>;
    url?: string;
    displayRequestDuration?: boolean;
    defaultModelsExpandDepth?: number;
    docExpansion?: "list" | "full" | "none";
    filter?: boolean | string;
    tryItOutEnabled?: boolean;
    [key: string]: unknown;
  }

  export default function SwaggerUI(props: SwaggerUIProps): ReactElement;
}
