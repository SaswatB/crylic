import { useEffect, useState } from "react";
import { useApolloClient } from "@apollo/client";
import { atom, useRecoilState } from "recoil";

import { AuthService } from "../../lib/api/AuthService";

export const AUTH_LOCAL_STORAGE_KEY = "authToken";

const authTokenState = atom<string | null>({
  key: AUTH_LOCAL_STORAGE_KEY,
  default: null,
});
let authTokenVerifyPromise: Promise<boolean> | null = null;

export async function getVerifiedAuthToken() {
  const token = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY);
  if (!token) return null;

  if (!authTokenVerifyPromise) {
    authTokenVerifyPromise = AuthService.checkToken(token)
      .then((d) => d.status === 200)
      .catch(() => false);
  }
  const verificationResult = await authTokenVerifyPromise;
  return verificationResult ? token : null;
}

export function useAuth() {
  const client = useApolloClient();
  const [authToken, setAuthTokenAtom] = useRecoilState(authTokenState);
  const setAuthToken = (token: string) => {
    localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, token);
    authTokenVerifyPromise = Promise.resolve(true);
    setAuthTokenAtom(token);
  };
  const logout = () => {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
    authTokenVerifyPromise = null;
    setAuthTokenAtom(null);
    client.resetStore();
  };

  // initially load and verify the login token
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    getVerifiedAuthToken().then((token) => {
      setAuthTokenAtom(token);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isLoading,
    isAuthenticated: !isLoading && !!authToken,
    authToken,
    setAuthToken,
    logout,
  };
}
