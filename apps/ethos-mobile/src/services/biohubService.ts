import { controlApiClient } from "./api/controlClient";

export interface BioHubStatus {
  hasBiohub: boolean;
  email: string;
  plan?: string;
  status?: "active" | "pending" | "none";
}

export const fetchBioHubStatus = async (): Promise<BioHubStatus> => {
  try {
    const data = await controlApiClient.request<BioHubStatus>("/v1/integrations/biohub/status", {
      method: "GET",
    });
    return data;
  } catch (error) {
    console.error("[BioHubService] Failed to fetch status:", error);
    return { hasBiohub: false, email: "" };
  }
};
