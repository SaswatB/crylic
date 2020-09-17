import React, { FunctionComponent, useEffect, useState } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { isEmpty } from "lodash";
import { useSnackbar } from "notistack";

import { useTextInputStructured } from "synergy/src/hooks/useInput";
import { validateEmail } from "synergy/src/lib/utils";

import { useAuth } from "../../hooks/recoil/useAuth";
import { AuthService } from "../../lib/api/AuthService";

interface Array<T> {
  map<U>(
    callbackfn: (value: T, index: number, array: T[]) => U,
    thisArg?: any
  ): { [K in keyof this]: U };
}

export const Authenticate: FunctionComponent = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { setAuthToken } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const firstNameInput = useTextInputStructured({
    label: "First Name",
    validate: (v) => !isEmpty(v),
  });
  const lastNameInput = useTextInputStructured({
    label: "Last Name",
    validate: (v) => !isEmpty(v),
  });
  const emailInput = useTextInputStructured({
    label: "Email",
    validate: validateEmail,
  });
  const passwordInput = useTextInputStructured({
    label: "Password",
    password: true,
    validate: (v) => !isEmpty(v),
  });
  useEffect(() => {
    if (!showRegister && !showLogin) {
      [firstNameInput, lastNameInput, emailInput, passwordInput].forEach(
        (i) => {
          i.triggerValidation(false);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLogin, showRegister]);

  const register = () => {
    if (
      [firstNameInput, lastNameInput, emailInput, passwordInput].filter((i) => {
        i.triggerValidation();
        return !i.isValid;
      }).length
    )
      return;

    AuthService.register(
      firstNameInput.value,
      lastNameInput.value,
      emailInput.value,
      passwordInput.value
    )
      .then((d) => {
        enqueueSnackbar("Registration successful! Please login to continue");
        setShowRegister(false);
      })
      .catch((e) => {
        enqueueSnackbar("Failed to register " + e.message);
        console.log("Failed to register", e);
      });
  };

  const login = () => {
    if (
      [emailInput, passwordInput].filter((i) => {
        i.triggerValidation();
        return !i.isValid;
      }).length
    )
      return;

    AuthService.login(emailInput.value, passwordInput.value)
      .then((d) => {
        if (!d.data?.success) throw new Error();

        enqueueSnackbar("Login successful!");
        setAuthToken(d.data.token);
        setShowLogin(false);
      })
      .catch((e) => {
        enqueueSnackbar("Failed to login " + e.message);
        console.log("Failed to login", e);
      });
  };

  return (
    <>
      <Dialog open={showRegister}>
        <DialogTitle>Sign Up</DialogTitle>
        <DialogContent className="flex flex-col">
          {firstNameInput.render()}
          <div className="mb-3" />
          {lastNameInput.render()}
          <div className="mb-3" />
          {emailInput.render()}
          <div className="mb-3" />
          {passwordInput.render()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRegister(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={register} color="primary">
            Register
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={showLogin}>
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent className="flex flex-col">
          {emailInput.render()}
          <div className="mb-3" />
          {passwordInput.render()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogin(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={login} color="primary">
            Login
          </Button>
        </DialogActions>
      </Dialog>
      <div className="btngrp-v w-full">
        <button className="btn" onClick={() => setShowLogin(true)}>
          Log In
        </button>
        <button className="btn" onClick={() => setShowRegister(true)}>
          Sign Up
        </button>
      </div>
    </>
  );
};
