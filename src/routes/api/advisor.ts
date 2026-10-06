import { createFileRoute } from "@tanstack/react-router";
import { handleAdvisor } from "@/lib/advisor.server";

export const Route = createFileRoute("/api/advisor")({
  server: { handlers: { POST: ({ request }) => handleAdvisor(request) } },
});
