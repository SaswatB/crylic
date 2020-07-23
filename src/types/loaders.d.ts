declare module "worker-loader!*" {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}
declare module "!!raw-loader!*" {
  const s: string;
  export default s;
}
declare module "!!../../../loaders/binaryLoader!*" {
  const b: Buffer;
  export default b;
}
