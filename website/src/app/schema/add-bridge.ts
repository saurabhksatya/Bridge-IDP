import z from "zod";

export const addBridgeSchema = z.object({
  bridgeName: z
    .string()
    .min(1, "Bridge name is required")
    .min(3, "Bridge name must be at least 3 characters"),
  bridgeId: z
    .string()
    .min(1, "Bridge ID is required")
    .min(5, "Bridge ID must be at least 5 characters"),
  bridgeSecret: z
    .string()
    .min(1, "Bridge secret is required")
    .min(3, "Bridge secret must be at least 3 characters"),
});
