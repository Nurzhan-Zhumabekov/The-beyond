import { createVariant, generateContent, getGeneration, getHistory, updateAsset } from "@/lib/api";

export const generationsService = {
  generate: generateContent,
  get: getGeneration,
  history: getHistory,
  updateAsset,
  createVariant,
};
