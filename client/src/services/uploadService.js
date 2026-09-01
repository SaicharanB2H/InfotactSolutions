import api from "./api";

export const uploadFile = async (file, pipelineId) => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("pipelineId", pipelineId);

  try {
    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;

  } catch (error) {
    console.error("Upload API error:", error);
    console.error("Status:", error.response?.status);
    console.error("Backend response:", error.response?.data);

    throw error;
  }
};