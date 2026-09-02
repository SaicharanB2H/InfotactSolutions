import api from "./api";

export const startJob = async (jobId, options = {}) => {
  const response = await api.post(`/jobs/${jobId}/start`, options);
  return response.data;
};

export const getJobStatus = async (id) => {
  const response = await api.get(`/jobs/${id}`);
  return response.data;
};

export const cancelJob = async (id) => {
  const response = await api.post(`/jobs/${id}/cancel`);
  return response.data;
};

export const getJobErrors = async (id, page = 1, limit = 50) => {
  const response = await api.get(`/jobs/${id}/errors`, {
    params: { page, limit },
  });
  return response.data;
};

export const deleteJob = async (id) => {
  const response = await api.delete(`/jobs/${id}`);
  return response.data;
};