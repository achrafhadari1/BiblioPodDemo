import axios from "axios";

const fetchCsrfToken = async () => {
  try {
    const response = await axios.get(
      "https://bibliopodv2-production.up.railway.app/api/csrf-token"
    );
    return response.data.csrf_token;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

export default fetchCsrfToken;
