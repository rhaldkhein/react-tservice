import { useState, useEffect } from "react";

interface IPair<T> { value: T | undefined; error: Error | undefined; }
type SubscribeFunc<T> = (value: IPair<T>) => void;
type CleanFunc = () => void;

export class Observable<T> {

  private _value: T;
  private _error: Error | undefined;
  private _subscribers: Array<SubscribeFunc<T>> = [];

  constructor(initial: T) {
    this._value = initial;
  }

  public get value(): T {
    return this._value;
  }

  public get error(): Error | undefined {
    return this._error;
  }

  /**
   * and set value. Also triggers all subscribers functions on set.
   */
  public set(value: T, silent?: boolean): void {
    this._value = value;
    this.fail(undefined, true);
    if (!silent) { this.notify(); }
  }

  /**
   * and set value. Also triggers all subscribers functions on set.
   */
  public fail(error: Error | undefined, silent?: boolean): void {
    this._error = error;
    if (!silent) { this.notify(); }
  }

  /**
   * Notify all subscribers that value has changed
   */
  public notify(): void {
    this._subscribers.forEach((sub) => sub({
      error: this._error,
      value: this._value
    }));
  }

  /**
   * Subscribe to changes but for internal use only.
   * Use `useObservable` hook to subscribe from component.
   * @param subFunc subscribe callback function
   */
  public subscribe(
    subFunc: SubscribeFunc<T>):
    CleanFunc {
    const idx = this._subscribers.indexOf(subFunc);
    if (idx > -1) { throw new Error("Subscription already exists"); }
    this._subscribers.push(subFunc);
    return () => {
      this._subscribers.splice(idx, 1);
    };
  }

}

export function createObservable<T>(
  initial: T):
  Observable<T> {

  return new Observable<T>(initial);
}

/**
 * Hook to observe an observable and export its value.
 * This will also trigger update to the component.
 * @param observable Observable
 * @param defaultValue Default value if observable is null or undefined
 */
export function useObservable<T>(
  observable: Observable<T> | null | undefined,
  defaultValue?: T):
  IPair<T> {

  observable = observable || undefined;
  const [state, setState] = useState<IPair<T>>(
    { value: observable?.value || defaultValue, error: observable?.error });
  useEffect(() => observable?.subscribe(setState) || undefined, [observable]);
  return state;
}
