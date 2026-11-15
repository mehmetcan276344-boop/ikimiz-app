import { defineRailway, project, service, volume } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "ikimiz";
export default defineRailway(() => {
  const data = volume("ikimiz-volume", {sizeMB:500,region:"iad"});
  const ikimiz = service("ikimiz", {
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    volumeMounts:{"/app/data":data},
    networking:{serviceDomains:{"ikimiz-production-31ff1f6c.up.railway.app":{port:8080}}},
    healthcheck: "/api/health",
    healthcheckTimeout: 30,
    replicas: { "iad": 1 },
  });

  return project("ikimiz", {
    variables: { managed: false },
    resources: [ikimiz,data],
  });
});
