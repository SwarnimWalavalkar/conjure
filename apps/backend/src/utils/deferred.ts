export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

export function createDeferred<T>(): Deferred<T> {
  let resolveFn: (value: T | PromiseLike<T>) => void = () => {};
  let rejectFn: (reason?: any) => void = () => {};

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    promise,
    resolve: (value: T | PromiseLike<T>) => resolveFn(value),
    reject: (reason?: any) => rejectFn(reason),
  };
}
