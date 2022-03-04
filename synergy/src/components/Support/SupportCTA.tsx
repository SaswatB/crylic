import React from "react";

import { useMenuInput } from "../../hooks/useInput";

export function SupportCTA({ openUrl }: { openUrl: (url: string) => void }) {
  const [, renderMenu, openMenu, closeMenu] = useMenuInput({
    options: [
      { name: "Privacy Policy", value: "privacyPolicy" },
      { name: "Terms & Conditions", value: "termsAndConditions" },
      { name: "End User License Agreement", value: "eula" },
    ].filter((o): o is { name: string; value: string } => !!o),
    disableSelection: true,
    onChange: (value) => {
      closeMenu();
      switch (value) {
        case "privacyPolicy":
          openUrl(
            "https://www.termsfeed.com/live/3eba34be-416c-4fcd-b514-cb69b642f17d"
          );
          break;
        case "termsAndConditions":
          openUrl(
            "https://www.termsfeed.com/live/f6799603-9c5d-48af-badd-b289f425fa38"
          );
          break;
        case "eula":
          // lm_dfb73d82a2 also hardcoded in app
          openUrl(
            "https://www.termsfeed.com/live/480cb202-3c9b-4065-aa97-090d43ea3ce4"
          );
          break;
      }
    },
  });

  return (
    <>
      <div
        className="absolute bottom-0 right-0 m-4 flex items-center justify-center bg-gray-700 text-white cursor-pointer hover:bg-gray-500 default-transition"
        style={{
          height: "50px",
          width: "50px",
          borderRadius: "100%",
          fontSize: "32px",
        }}
        onClick={openMenu}
      >
        <span className="select-none">?</span>
      </div>
      {renderMenu()}
    </>
  );
}
