import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://bibliopodv2-production.up.railway.app/api",
  withCredentials: true,
  timeout: 10000, // 10 second timeout
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add request interceptor for performance monitoring
axiosInstance.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for performance monitoring
axiosInstance.interceptors.response.use(
  (response) => {
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    console.log(
      `API ${response.config.method?.toUpperCase()} ${
        response.config.url
      } took ${duration}ms`
    );
    return response;
  },
  (error) => {
    if (error.config?.metadata) {
      const endTime = new Date();
      const duration = endTime - error.config.metadata.startTime;
      console.log(
        `API ${error.config.method?.toUpperCase()} ${
          error.config.url
        } failed after ${duration}ms`
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
