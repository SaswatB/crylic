import React, { FunctionComponent } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";

interface Props {
  icon: IconProp;
  iconProps?: Omit<FontAwesomeIconProps, "icon">;
}
export const IconButton: FunctionComponent<
  Props &
    React.DetailedHTMLProps<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    >
> = ({ icon, iconProps, ...rest }) => {
  return (
    <button {...rest}>
      <FontAwesomeIcon
        icon={icon}
        className="text-gray-500 hover:text-white default-transition"
        {...iconProps}
      />
    </button>
  );
};
