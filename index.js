class PromiseDIY {
  // 1.1 "promise" is an object or function
  constructor (executor) {
    this.state = 'pending'
    this.value = undefined // 1.3 "value" is any legal JavaScript value (including undefined, a thenable, or a promise).
    this.reason = undefined // 1.5 "reason" is a value that indicates why a promise was rejected.

    this.onResolvedCallbacks = []
    this.onRejectedCallbacks = []

    let resolve = value => {
      if (this.state === 'pending') {
        this.state = 'fulfilled'
        this.value = value

        this.onResolvedCallbacks.forEach(fn => fn())
      }
    }

    let reject = reason => {
      if (this.state === 'pending') {
        this.state = 'rejected'
        this.reason = reason

        this.onRejectedCallbacks.forEach(fn => fn())
      }
    }

    try {
      executor(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  // 1.1 "promise" is an object or function with a then method whose behavior conforms to this specification.
  then (onFulfilled, onRejected) {
    // 2.2.7 then must return a promise
    let promise2 = new PromiseDIY((resolve, reject) => {
      if (this.state === 'fulfilled') {
        setTimeout(() => { // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
          try {
            if (typeof onFulfilled !== 'function') {
              // 2.2.1.1 If onFulfilled is not a function, it must be ignored.
              // 2.2.7.3 If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value as promise1.
              resolve(this.value)
              return
            }
            // 2.2.2 If onFulfilled is a function,
            // 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument.
            // 2.2.2.2 it must not be called before promise is fulfilled.
            // 2.2.2.3 it must not be called more than once.
            // 2.2.5 onFulfilled must be called as functions (i.e. with no this value).
            // 2.2.7.1 If onFulfilled returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
            let x = onFulfilled(this.value)
            promiseResolutionProcedure(promise2, x, resolve, reject)
          } catch (err) {
            // 2.2.7.2 If onFulfilled throws an exception e, promise2 must be rejected with e as the reason.
            reject(err)
          }
        }, 0)
      }

      if (this.state === 'rejected') {
        setTimeout(() => { // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
          try {
            if (typeof onRejected !== 'function') {
              // 2.2.1.2 If onRejected is not a function, it must be ignored.
              // 2.2.7.4 If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason as promise1.
              reject(this.reason)
              return
            }
            // 2.2.3 If onRejected is a function,
            // 2.2.3.1 it must be called after promise is rejected, with promise’s reason as its first argument.
            // 2.2.3.2 it must not be called before promise is rejected.
            // 2.2.3.3 it must not be called more than once.
            // 2.2.5 onRejected must be called as functions (i.e. with no this value).
            // 2.2.7.1 If onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x).
            let x = onRejected(this.reason)
            promiseResolutionProcedure(promise2, x, resolve, reject)
          } catch (err) {
            // 2.2.7.2 If onRejected throws an exception e, promise2 must be rejected with e as the reason.
            reject(err)
          }
        }, 0)
      }

      if (this.state === 'pending') {
        this.onResolvedCallbacks.push(() => {
          setTimeout(() => { // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
            try {
              if (typeof onFulfilled !== 'function') {
                resolve(this.value)
                return
              }

              let x = onFulfilled(this.value)
              promiseResolutionProcedure(promise2, x, resolve, reject)
            } catch (err) {
              reject(err)
            }
          }, 0)
        })

        this.onRejectedCallbacks.push(() => {
          setTimeout(() => { // 2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code.
            try {
              if (typeof onRejected !== 'function') {
                reject(this.reason)
                return
              }

              let x = onRejected(this.reason)
              promiseResolutionProcedure(promise2, x, resolve, reject)
            } catch (err) {
              reject(err)
            }
          }, 0)
        })
      }
    })

    return promise2
  }
}

let promiseResolutionProcedure = (promise, x, resolve, reject) => {
  // 2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.
  if (promise === x) {
    reject(new TypeError('Chaining cycle detected for promise'))
  }

  let called

  // 2.3.3 Otherwise, if x is an object or function,
  if ((typeof x === 'object' || typeof x === 'function') && x !== null) {
    try {
      // 2.3.3.1 Let then be x.then.
      let then = x.then

      // 2.3.3.3 If then is a function
      if (typeof then === 'function') {
        then.call(
          x, // call it with x as this
          y => {
            // 2.3.3.3.3 If both resolvePromise and rejectPromise are called,
            // or multiple calls to the same argument are made, the first call takes precedence,
            // and any further calls are ignored.
            if (called) return

            called = true

            // 2.3.3.3.1 If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
            promiseResolutionProcedure(promise, y, resolve, reject)
          },
          r => {
            // 2.3.3.3.3 If both resolvePromise and rejectPromise are called,
            // or multiple calls to the same argument are made, the first call takes precedence,
            // and any further calls are ignored.
            if (called) return

            called = true

            // 2.3.3.3.2 If/when rejectPromise is called with a reason r, reject promise with r.
            reject(r)
          }
        )
      } else {
        // 2.3.3.4 If then is not a function, fulfill promise with x.
        resolve(x)
      }
    } catch (err) { // 2.3.3.3.4 If calling then throws an exception e,
      if (called) return // 2.3.3.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.

      called = true

      // 2.3.3.3.4.2 Otherwise, reject promise with e as the reason.
      reject(err)
    }
  } else {
    // 2.3.4 If x is not an object or function, fulfill promise with x.
    resolve(x)
  }
}

// For promises-aplus-tests only
PromiseDIY.deferred = function () {
  let deferred = {}
  deferred.promise = new PromiseDIY((resolve, reject) => {
    deferred.resolve = resolve
    deferred.reject = reject
  })
  return deferred
}

module.exports = PromiseDIY
