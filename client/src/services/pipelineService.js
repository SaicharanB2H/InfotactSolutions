import api from "./api";

export const createPipeline = async (pipelineData) => {
  const response = await api.post("/pipelines", pipelineData);
  return response.data;
};

export const getAllPipelines = async () => {
  const response = await api.get("/pipelines");
  return response.data;
};

export const getPipelineById = async (id) => {
  const response = await api.get(`/pipelines/${id}`);
  return response.data;
};

export const updatePipeline = async (id, pipelineData) => {
  const response = await api.put(`/pipelines/${id}`, pipelineData);
  return response.data;
};

export const deletePipeline = async (id) => {
  const response = await api.delete(`/pipelines/${id}`);
  return response.data;
};