export function getParam(url: string, key: string): string {
  const match = url.match(new RegExp(`${key}=([^;]+)`));
  return match ? match[1] : "";
}

export function parseConnectionUrl(connectionUrl: string) {
  const serverMatch = connectionUrl.match(/sqlserver:\/\/([^:;]+)/);
  const portMatch = connectionUrl.match(/:(\d+);/);

  return {
    server: serverMatch?.[1] ?? "localhost",
    port: portMatch ? parseInt(portMatch[1], 10) : 1433,
    database: getParam(connectionUrl, "database") || "bms_dashboard",
    user: getParam(connectionUrl, "user") || "SA",
    password: getParam(connectionUrl, "password") || "",
    options: {
      encrypt: getParam(connectionUrl, "encrypt") === "true",
      trustServerCertificate: getParam(connectionUrl, "trustServerCertificate") !== "false",
    },
  };
}
