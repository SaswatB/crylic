import React, { useEffect, useState } from "react";

let setModalInContainer:
  | React.Dispatch<React.SetStateAction<React.ReactNode>>
  | undefined;
export const ModalContainer = () => {
  const [modal, setModal] = useState<React.ReactNode>(null);
  setModalInContainer = setModal;
  useEffect(() => () => setModal(null), []);
  return <>{modal}</>;
};

export const createModal = <P, R>(
  Modal: React.FunctionComponent<P & { resolve: (v: R) => void }>
) => (props: P) =>
  new Promise<R>((resolve) => {
    const resolveWrapper = (r: R) => {
      resolve(r);
      setModalInContainer?.(null);
    };
    setModalInContainer?.(<Modal {...props} resolve={resolveWrapper} />);
  });
