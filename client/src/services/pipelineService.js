import api from "./api";

export const createPipeline = async (pipelineData) => {
  const response = await api.post("/pipelines", pipelineData);
  return response.data;
};

export const getPipeline = async (id) => {
  const response = await api.get(`/pipelines/${id}`);
  return response.data;
};