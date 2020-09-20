import { useApolloClient } from "@apollo/client";
import { atom, useRecoilState } from "recoil";

export const AUTH_LOCAL_STORAGE_KEY = "authToken";

const authTokenState = atom<string | null>({
  key: AUTH_LOCAL_STORAGE_KEY,
  default: localStorage.getItem(AUTH_LOCAL_STORAGE_KEY),
});

export function useAuth() {
  const client = useApolloClient();
  const [authToken, setAuthTokenAtom] = useRecoilState(authTokenState);
  const setAuthToken = (token: string) => {
    localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, token);
    setAuthTokenAtom(token);
  };
  const logout = () => {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
    setAuthTokenAtom(null);
    client.resetStore();
  };

  const isLoading = false,
    isAuthenticated = !!authToken;

  return {
    isLoading,
    isAuthenticated,
    authToken,
    setAuthToken,
    logout,
  };
}
