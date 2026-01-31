import axios from "axios";

const API = "http://127.0.0.1:5000/api";

// Auth
export const registerUser = (data) => axios.post(`${API}/register`, data);
export const loginUser = (data) => axios.post(`${API}/login`, data);

// User dashboard
export const addSubject = (data) => axios.post(`${API}/subject`, data);
export const getSubjects = (user_id) => axios.get(`${API}/subjects/${user_id}`);
export const deleteSubject = (id) => axios.delete(`${API}/subject/${id}`);
export const getSchedule = (user_id) => axios.get(`${API}/schedule/${user_id}`);

// 🔐 ADMIN APIs
export const getAllUsers = () => axios.get(`${API}/admin/users`);
export const deleteUser = (id) => axios.delete(`${API}/admin/user/${id}`);
export const updateUser = (id, data) =>
  axios.put(`${API}/admin/user/${id}`, data);
