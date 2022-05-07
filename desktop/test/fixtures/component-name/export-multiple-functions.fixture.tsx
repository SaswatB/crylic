import React from "react";

export function ComponentFunction1() {
  return <div />;
}

export default function ComponentFunction2() {
  return <div />;
}

function ComponentFunction3() {
  return <div />;
}

export { ComponentFunction3 };

export const ComponentFunction4 = () => {
  return <div />;
};

export const NotAComponent = 1;
