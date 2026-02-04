import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const ingestContent = async (data: { url?: string; rawText?: string; targetAudience?: string }) => {
    const response = await axios.post(`${API_BASE_URL}/ingest`, data);
    return response.data;
};

export const generateContent = async (id: string) => {
    const response = await axios.post(`${API_BASE_URL}/generate`, { id });
    return response.data;
};

export const getContent = async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/content/${id}`);
    return response.data;
};
