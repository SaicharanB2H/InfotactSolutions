import api from "./api";

export const getSystemHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};
