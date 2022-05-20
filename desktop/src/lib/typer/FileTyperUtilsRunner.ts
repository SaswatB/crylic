import * as Comlink from "comlink";
import { Subscription } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";

import { LTBehaviorSubject } from "synergy/src/lib/lightObservable/LTBehaviorSubject";
import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { PortablePath } from "synergy/src/lib/project/PortablePath";
import { eagerMapArrayAny } from "synergy/src/lib/rxjs/eagerMap";

import type { FileTyperUtilsWorker } from "./FileTyperUtilsWorker";

export class FileTyperUtilsRunner {
  private worker = new Worker(
    new URL("./FileTyperUtilsWorker.ts", import.meta.url)
  );
  private proxy = Comlink.wrap<FileTyperUtilsWorker>(this.worker);
  private codeEntrySubscription: Subscription;

  constructor(
    protected projectPath: PortablePath,
    protected readonly codeEntries$: LTBehaviorSubject<CodeEntry[]>
  ) {
    // init the ts service
    void this.proxy.init(
      projectPath.getNativePath(),
      codeEntries$.getValue().map((c) => c.getRemoteCodeEntry())
    );

    // keep track of code updates and send them to the worker
    this.codeEntrySubscription = this.codeEntries$
      .toRXJS()
      .pipe(
        eagerMapArrayAny((codeEntry) =>
          codeEntry.code$.toRXJS().pipe(
            distinctUntilChanged(),
            map(() => codeEntry)
          )
        )
      )
      .subscribe((codeEntry) => {
        // todo debounce?
        void this.proxy.updateCodeEntries([codeEntry.getRemoteCodeEntry()]);
      });
  }

  public getProxy() {
    return this.proxy;
  }

  public dispose() {
    this.codeEntrySubscription.unsubscribe();
    this.proxy[Comlink.releaseProxy]();
    this.worker.terminate();
  }
}
