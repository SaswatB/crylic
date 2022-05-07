import { BehaviorSubject } from "rxjs";

import { LTObservable } from "./LTObservable";

export class LTBehaviorSubject<T> extends LTObservable<T> {
  private rxjsSubject: BehaviorSubject<T> | undefined;

  public constructor(private value: T) {
    super();
  }

  public override subscribe(callback: (newValue: T) => void) {
    callback(this.value);
    return super.subscribe(callback);
  }

  public getValue() {
    return this.value;
  }

  public next(value: T) {
    if (this.value === value) return;

    this.value = value;
    this.pushToSubscribers(value);
    this.rxjsSubject?.next(value);
  }

  public toRXJS() {
    if (!this.rxjsSubject) {
      this.rxjsSubject = new BehaviorSubject(this.value);
    }
    return this.rxjsSubject;
  }
}
