declare global {
  interface Window {
    appzi?: {
      openWidget: (surveyId: string) => void;
    };
  }
}
