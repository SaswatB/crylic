import React from "react";
import { useSnackbar } from "notistack";

import { useMenuInput } from "../../hooks/useInput";
import { Tour } from "../Tour/Tour";

export function SupportCTA({ openUrl }: { openUrl: (url: string) => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [, renderMenu, openMenu, closeMenu] = useMenuInput({
    options: [
      { name: "Documentation", value: "documentation" },
      { name: "Feedback", value: "feedback" },
      { divider: true },
      { name: "Privacy Policy", value: "privacyPolicy" },
      { name: "Terms & Conditions", value: "termsAndConditions" },
      { name: "End User License Agreement", value: "eula" },
    ].filter((o): o is { name: string; value: string } => !!o),
    disableSelection: true,
    onChange: (value) => {
      closeMenu();
      switch (value) {
        case "documentation":
          openUrl("https://docs.crylic.io");
          break;
        case "feedback":
          if (appzi) {
            window.appziSettings = {
              data: {
                version: __COMMIT_HASH__,
              },
            };
            appzi.openWidget("e0662074-0ac7-4f34-887e-9ee031379f0c");
          } else
            enqueueSnackbar("Feedback widget is not available", {
              variant: "error",
            });
          break;

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
          height: "30px",
          width: "30px",
          borderRadius: "100%",
          fontSize: "22px",
        }}
        data-tour="support"
        onClick={openMenu}
      >
        <Tour name="support" beaconStyle={{ left: 10 }}>
          We're here to help! Use this widget to submit feedback or access
          helpful resources such as our documentation site.
        </Tour>
        <span className="select-none">?</span>
      </div>
      {renderMenu()}
    </>
  );
}
