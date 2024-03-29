import Axios from "axios";

export const AuthService = {
  register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) {
    const formData = new FormData();
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("email", email);
    formData.append("password", password);
    return Axios.post("/api/auth/register", formData);
  },

  login(email: string, password: string) {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    return Axios.post("/api/auth/login", formData);
  },

  checkToken(token: string) {
    return Axios.post(
      "/api/auth/check_token",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
};
