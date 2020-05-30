import React, {
  FunctionComponent,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

export const TourContext = React.createContext({
  shownTourSteps: [] as string[],
  setShownTourSteps: (value: string[]) => {},
  isAFloaterVisible: false,
  setAFloaterVisible: (value: boolean) => {},
  tourDisabled: false,
  setTourDisabled: (value: boolean) => {},
  resetTour: () => {},
});

export const TourProvider: FunctionComponent = ({ children }) => {
  const [shownTourSteps, setShownTourSteps] = useState<string[]>([]);
  const [isAFloaterVisible, setAFloaterVisible] = useState(false);
  const [tourDisabled, setTourDisabled] = useState(false);
  return (
    <TourContext.Provider
      value={{
        shownTourSteps,
        setShownTourSteps,
        isAFloaterVisible,
        setAFloaterVisible,
        tourDisabled,
        setTourDisabled,
        resetTour: () => setShownTourSteps([]),
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

interface Props {
  name: string;
  dependencies?: string[];
  autoOpen?: boolean;
  spotlightSelector?: string;
  disableSpotlight?: boolean;
  beaconStyle?: React.CSSProperties;
  onOpen?: () => void;
}
export const Tour: FunctionComponent<Props> = ({
  name,
  dependencies,
  autoOpen,
  spotlightSelector,
  disableSpotlight,
  beaconStyle,
  onOpen,
  children,
}) => {
  const {
    shownTourSteps,
    setShownTourSteps,
    isAFloaterVisible,
    setAFloaterVisible,
    tourDisabled,
  } = useContext(TourContext);
  const [floaterVisible, setFloaterVisible] = useState(false);
  const [spotlight, setSpotlight] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  }>();

  const openFloater = () => {
    setFloaterVisible(true);
    setAFloaterVisible(true);
    setSpotlight(undefined);
    onOpen?.();
  };
  const closeFloater = () => {
    setFloaterVisible(false);
    setAFloaterVisible(false);
    setShownTourSteps([...shownTourSteps, name]);
  };

  // calculate the location of the spotlight when the floater is shown
  useEffect(() => {
    if (!floaterVisible) return;

    const elements = document.querySelectorAll(
      spotlightSelector || `[data-tour="${name}"]`
    );
    if (elements.length > 0) {
      let top: number | undefined;
      let left: number | undefined;
      let bottom: number | undefined;
      let right: number | undefined;
      elements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (top === undefined || top > bounds.top) top = bounds.top;
        if (left === undefined || left > bounds.left) left = bounds.left;
        if (bottom === undefined || bottom < bounds.bottom)
          bottom = bounds.bottom;
        if (right === undefined || right < bounds.right) right = bounds.right;
      });
      setSpotlight({
        top: top!,
        left: left!,
        width: right! - left!,
        height: bottom! - top!,
      });
    }
  }, [name, floaterVisible, spotlightSelector]);

  const dependenciesResolved =
    dependencies?.every((dependency) => shownTourSteps.includes(dependency)) ??
    true;

  // auto open floaters
  useEffect(() => {
    if (
      !tourDisabled &&
      dependenciesResolved &&
      autoOpen &&
      !shownTourSteps.includes(name)
    )
      openFloater();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, shownTourSteps.includes(name), dependenciesResolved]);

  if (floaterVisible) {
    return createPortal(
      <>
        <div className={`tour-floater-background`}>
          {!disableSpotlight && spotlight && (
            <div
              className="tour-floater-spotlight"
              style={{
                top: spotlight.top - 8,
                left: spotlight.left - 8,
                width: spotlight.width + 2 * 8,
                height: spotlight.height + 2 * 8,
              }}
            />
          )}
        </div>
        <div className="tour-floater-container">
          <div className="tour-floater">
            <div className="tour-floater-body">{children}</div>
            <button className="btn" onClick={() => closeFloater()}>
              Close
            </button>
          </div>
        </div>
      </>,
      document.getElementById("tour-floater-portal")!
    );
  }

  // don't render the beacon if the tour is disabled, the floater was already shown, another floater is visible or a dep hasn't been shown yet
  if (
    tourDisabled ||
    shownTourSteps.includes(name) ||
    isAFloaterVisible ||
    !dependenciesResolved
  )
    return null;

  return (
    <div className="tour-beacon" onClick={() => openFloater()}>
      <div className="tour-beacon-content-container" style={beaconStyle}>
        <div className="tour-beacon-border" />
        <div className="tour-beacon-content" />
      </div>
    </div>
  );
};
