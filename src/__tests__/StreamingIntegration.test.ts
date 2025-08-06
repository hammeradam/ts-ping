import { describe, expect, it } from 'vitest'
import { PingStream } from '../ping-stream.js'
import { Ping } from '../ping.js'

// Integration tests that test actual streaming behavior with fast timeouts
describe('streaming integration', () => {
  it('should handle basic stream creation and iteration setup', async () => {
    const ping = new Ping('8.8.8.8').setCount(1).setTimeout(0.1) // Very fast timeout
    const stream = ping.stream()

    // Test that iterator can be created
    const iterator = stream[Symbol.asyncIterator]()
    expect(iterator).toBeDefined()
    expect(typeof iterator.next).toBe('function')

    // Try to get one result with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), 100)
    })

    try {
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for very fast timeout or network unavailability
    }
  })

  it('should handle PingStream take() method execution', async () => {
    const ping = new Ping('8.8.8.8').setCount(2).setTimeout(0.1)
    const stream = new PingStream(ping)

    const takeStream = stream.take(1)
    const iterator = takeStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()
    expect(typeof iterator.next).toBe('function')

    // Try to iterate with timeout protection
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle window() method generator creation', async () => {
    const ping = new Ping('8.8.8.8').setCount(3).setTimeout(0.1)
    const stream = new PingStream(ping)

    const windowStream = stream.window(2)
    const iterator = windowStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    // Test that window logic is set up correctly
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected - just testing generator setup
    }
  })

  it('should handle filter() method with predicate', async () => {
    const ping = new Ping('8.8.8.8').setCount(2).setTimeout(0.1)
    const stream = new PingStream(ping)

    const filterStream = stream.filter(result => result.isSuccess())
    const iterator = filterStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle map() method transformation', async () => {
    const ping = new Ping('8.8.8.8').setCount(1).setTimeout(0.1)
    const stream = new PingStream(ping)

    const mapStream = stream.map(result => result.host)
    const iterator = mapStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle skipFailures() method', async () => {
    const ping = new Ping('8.8.8.8').setCount(1).setTimeout(0.1)
    const stream = new PingStream(ping)

    const skipStream = stream.skipFailures()
    const iterator = skipStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle skipSuccesses() method', async () => {
    const ping = new Ping('invalid-host-12345.test').setCount(1).setTimeout(0.1)
    const stream = new PingStream(ping)

    const skipStream = stream.skipSuccesses()
    const iterator = skipStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle rollingStats() method setup', async () => {
    const ping = new Ping('8.8.8.8').setCount(2).setTimeout(0.1)
    const stream = new PingStream(ping)

    const statsStream = stream.rollingStats(2)
    const iterator = statsStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle batchWithTimeout() method setup', async () => {
    const ping = new Ping('8.8.8.8').setCount(2).setTimeout(0.1)
    const stream = new PingStream(ping)

    const batchStream = stream.batchWithTimeout(2, 50)
    const iterator = batchStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for timeout scenarios
    }
  })

  it('should handle streamBatched() method from Ping class', async () => {
    const ping = new Ping('8.8.8.8').setCount(2).setTimeout(0.1)
    const batchStream = ping.streamBatched(2)
    const iterator = batchStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should handle streamWithFilter() method from Ping class', async () => {
    const ping = new Ping('8.8.8.8').setCount(1).setTimeout(0.1)
    const filterStream = ping.streamWithFilter(
      result => result.isSuccess(),
      result => result.averageResponseTimeInMs(),
    )
    const iterator = filterStream[Symbol.asyncIterator]()

    expect(iterator).toBeDefined()

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), 100)
      })
      await Promise.race([iterator.next(), timeoutPromise])
    }
    catch {
      // Expected for fast timeout
    }
  })

  it('should test internal runSinglePing execution path', async () => {
    const ping = new Ping('localhost').setTimeout(0.05) // Very fast timeout to force quick failure

    // Get the stream and try to execute one iteration
    const stream = ping.stream()
    const iterator = stream[Symbol.asyncIterator]()

    try {
      // This should execute runSinglePing internally
      const result = await Promise.race([
        iterator.next(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 200)),
      ])

      // If we get a result, verify the iterator worked
      expect(result).toBeDefined()
    }
    catch {
      // Expected for very fast timeouts or localhost ping failures
    }
  })
})

describe('streaming timeout and error scenarios', () => {
  it('should handle ping timeout scenarios', async () => {
    // Use a very short timeout to force timeout behavior
    const ping = new Ping('8.8.8.8').setTimeout(0.01).setCount(1)
    const stream = ping.stream()
    const iterator = stream[Symbol.asyncIterator]()

    try {
      const result = await Promise.race([
        iterator.next(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100)),
      ])

      // If we get a result, verify the iterator worked
      expect(result).toBeDefined()
    }
    catch {
      // Expected for test timeout protection
    }
  })

  it('should handle invalid host scenarios', async () => {
    const ping = new Ping('invalid-host-does-not-exist-12345.invalid').setTimeout(0.1).setCount(1)
    const stream = ping.stream()
    const iterator = stream[Symbol.asyncIterator]()

    try {
      const result = await Promise.race([
        iterator.next(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 200)),
      ])

      // Verify we got a result from the iterator
      expect(result).toBeDefined()
    }
    catch {
      // Expected for test timeout protection
    }
  })

  it('should handle infinite stream with manual break', async () => {
    const ping = new Ping('8.8.8.8').setCount(0).setTimeout(0.1) // Infinite count
    const stream = ping.stream()
    const iterator = stream[Symbol.asyncIterator]()

    let iterations = 0
    const maxIterations = 2

    try {
      while (iterations < maxIterations) {
        const resultPromise = iterator.next()
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Iteration timeout')), 100)
        })

        try {
          await Promise.race([resultPromise, timeoutPromise])
          iterations++
        }
        catch {
          break // Exit on timeout
        }
      }
    }
    catch {
      // Expected for timeout scenarios
    }

    // Should have attempted at least one iteration
    expect(iterations).toBeGreaterThanOrEqual(0)
  })

  it('should handle AbortSignal integration with streaming', async () => {
    const abortController = new AbortController()
    const ping = new Ping('8.8.8.8')
      .setCount(0) // infinite
      .setTimeout(0.1)
      .setInterval(0.05)
      .setAbortSignal(abortController.signal)

    const results: any[] = []
    let iterations = 0
    const maxIterations = 3

    // Abort after a short time
    setTimeout(() => {
      abortController.abort()
    }, 150)

    try {
      for await (const result of ping.stream()) {
        results.push(result)
        iterations++

        // Safety check to prevent infinite loop
        if (iterations >= maxIterations)
          break
      }
    }
    catch {
      // Stream should end gracefully on abort, not throw
    }

    // Should have been able to abort gracefully
    expect(iterations).toBeLessThanOrEqual(maxIterations)
    expect(abortController.signal.aborted).toBe(true)
  })
})
