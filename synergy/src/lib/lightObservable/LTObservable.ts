import { LTOperator } from "./LTOperator";

export interface LTSubscription {
  unsubscribe(): void;
  isSubscribed(): boolean;
}

export class LTObservable<T> {
  private subscriberIdCounter = 0;
  protected subscribers: { id: number; callback: (newValue: T) => void }[] = [];

  public subscribe(callback: (newValue: T) => void): LTSubscription {
    const id = this.subscriberIdCounter++;
    this.subscribers.push({ id, callback });
    let isSubscribed = true;

    return {
      unsubscribe: () => {
        this.unsubscribe(id);
        isSubscribed = false;
      },
      isSubscribed: () => isSubscribed,
    };
  }

  protected unsubscribe(id: number) {
    const subscription = this.subscribers.findIndex((s) => s.id === id);
    if (subscription !== -1) this.subscribers.splice(subscription, 1);
  }

  protected pushToSubscribers(value: T) {
    this.subscribers.forEach((subscriber) => subscriber.callback(value));
  }

  public pipe<U>(operator: LTOperator<T, U>): LTObservable<U> {
    return new LTDerivedObservable(this, operator);
  }
}

class LTDerivedObservable<S, T> extends LTObservable<T> {
  private cachedValue: { value: T } | undefined;
  private baseSubscription: LTSubscription | undefined;
  private operatorSubscription: LTSubscription | undefined;

  public constructor(
    private base: LTObservable<S>,
    private operator: LTOperator<S, T>
  ) {
    super();
  }

  public override subscribe(callback: (newValue: T) => void) {
    // subscribe to the base if this is the first subscriber
    if (!this.baseSubscription) {
      const subscription = this.base.subscribe((newValue) =>
        this.operator.next(newValue, (newOperatorValue) => {
          if (!subscription.isSubscribed()) return; // ignore events from the operator if the base is unsubscribed

          if (newOperatorValue instanceof LTObservable) {
            // if the operator returns an observable, subscribe to it
            if (this.operatorSubscription)
              this.operatorSubscription.unsubscribe();
            this.operatorSubscription = newOperatorValue.subscribe(
              (subOperatorValue) => this.pushToSubscribers(subOperatorValue)
            );
          } else {
            this.pushToSubscribers(newOperatorValue);
          }
        })
      );
      this.baseSubscription = subscription;
    }
    if (this.cachedValue) callback(this.cachedValue.value);

    return super.subscribe(callback);
  }

  protected override unsubscribe(id: number) {
    super.unsubscribe(id);

    // unsubscribe from the base if there are no more subscribers
    if (this.subscribers.length === 0) {
      this.cachedValue = undefined;
      this.baseSubscription?.unsubscribe();
      this.baseSubscription = undefined;
      this.operatorSubscription?.unsubscribe();
      this.operatorSubscription = undefined;
      this.operator.clearState?.();
    }
  }

  protected override pushToSubscribers(value: T) {
    super.pushToSubscribers(value);
    this.cachedValue = { value };
  }
}
