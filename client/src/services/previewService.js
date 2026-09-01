import api from "./api";

export const previewCsv = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post("/preview", formData);

  return response.data;
};