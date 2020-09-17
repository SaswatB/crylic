import { atom, useRecoilState } from "recoil";

const authTokenState = atom<string | null>({
  key: "authToken",
  default: localStorage.getItem("authToken"),
});

export function useAuth() {
  const [authToken, setAuthTokenAtom] = useRecoilState(authTokenState);
  const setAuthToken = (token: string | null) => {
    if (token === null) {
      localStorage.removeItem("authToken");
    } else {
      localStorage.setItem("authToken", token);
    }
    setAuthTokenAtom(token);
  };

  const isLoading = false,
    isAuthenticated = !!authToken;

  return {
    isLoading,
    isAuthenticated,
    authToken,
    setAuthToken,
    logout: () => setAuthToken(null),
  };
}
