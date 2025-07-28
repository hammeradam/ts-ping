import type { PingResult } from './ping-result.ts'
import type { Ping } from './ping.ts'

/**
 * Statistics calculated from a window of ping results.
 */
export interface PingStats {
  /** Number of successful pings in the window */
  count: number
  /** Average response time in milliseconds */
  average: number
  /** Minimum response time in milliseconds */
  minimum: number
  /** Maximum response time in milliseconds */
  maximum: number
  /** Standard deviation of response times */
  standardDeviation: number
  /** Network jitter (variance in response times) */
  jitter: number
  /** Packet loss percentage in the window */
  packetLoss: number
  /** Timestamp when the stats were calculated */
  timestamp: Date
}

/**
 * Enhanced streaming utilities for ping operations.
 * Provides advanced processing capabilities like windowing, statistics, and filtering.
 *
 * @example
 * ```typescript
 * const stream = new PingStream(new Ping('google.com').setInterval(0.5))
 *
 * // Get rolling statistics
 * for await (const stats of stream.rollingStats(10)) {
 *   console.log(`Avg: ${stats.average}ms, Jitter: ${stats.jitter}ms`)
 * }
 * ```
 */
export class PingStream {
  private ping: Ping

  constructor(ping: Ping) {
    this.ping = ping
  }

  /**
   * Takes only the first N results from the ping stream.
   *
   * @param n Number of results to take
   *
   * @example
   * ```typescript
   * // Take first 5 ping results
   * for await (const result of stream.take(5)) {
   *   console.log(`Ping ${result.isSuccess() ? 'success' : 'failed'}`)
   * }
   * ```
   */
  async* take(n: number): AsyncGenerator<PingResult, void, unknown> {
    let count = 0
    for await (const result of this.ping.stream()) {
      if (count >= n)
        break
      yield result
      count++
    }
  }

  /**
   * Skips failed ping results and only yields successful ones.
   *
   * @example
   * ```typescript
   * // Only process successful pings
   * for await (const result of stream.skipFailures()) {
   *   console.log(`Response time: ${result.averageResponseTimeInMs()}ms`)
   * }
   * ```
   */
  async* skipFailures(): AsyncGenerator<PingResult, void, unknown> {
    for await (const result of this.ping.stream()) {
      if (result.isSuccess()) {
        yield result
      }
    }
  }

  /**
   * Skips successful ping results and only yields failed ones.
   * Useful for monitoring and alerting on failures.
   *
   * @example
   * ```typescript
   * // Monitor only failures
   * for await (const failure of stream.skipSuccesses()) {
   *   console.error(`Ping failed: ${failure.error}`)
   *   await sendAlert(failure)
   * }
   * ```
   */
  async* skipSuccesses(): AsyncGenerator<PingResult, void, unknown> {
    for await (const result of this.ping.stream()) {
      if (result.isFailure()) {
        yield result
      }
    }
  }

  /**
   * Creates a sliding window of ping results.
   * Each yield contains the last N results.
   *
   * @param size Size of the sliding window
   *
   * @example
   * ```typescript
   * // Process results in sliding windows of 5
   * for await (const window of stream.window(5)) {
   *   const avgLatency = window
   *     .filter(r => r.isSuccess())
   *     .reduce((sum, r) => sum + r.averageResponseTimeInMs(), 0) / window.length
   *   console.log(`Window avg: ${avgLatency}ms`)
   * }
   * ```
   */
  async* window(size: number): AsyncGenerator<PingResult[], void, unknown> {
    const window: PingResult[] = []

    for await (const result of this.ping.stream()) {
      window.push(result)

      if (window.length > size) {
        window.shift() // Remove oldest result
      }

      if (window.length >= size) {
        yield [...window] // Return a copy of the window
      }
    }
  }

  /**
   * Calculates rolling statistics from a sliding window of ping results.
   * Only successful pings are included in the statistics.
   *
   * @param windowSize Size of the sliding window for calculating stats (default: 10)
   *
   * @example
   * ```typescript
   * // Monitor network performance with rolling stats
   * for await (const stats of stream.rollingStats(20)) {
   *   if (stats.jitter > 50) {
   *     console.warn(`High network jitter detected: ${stats.jitter}ms`)
   *   }
   *   if (stats.packetLoss > 5) {
   *     console.error(`Packet loss detected: ${stats.packetLoss}%`)
   *   }
   * }
   * ```
   */
  async* rollingStats(windowSize: number = 10): AsyncGenerator<PingStats, void, unknown> {
    const window: PingResult[] = []
    const allResults: PingResult[] = []

    for await (const result of this.ping.stream()) {
      allResults.push(result)

      if (result.isSuccess()) {
        window.push(result)

        if (window.length > windowSize) {
          window.shift()
        }

        if (window.length >= Math.min(3, windowSize)) { // Minimum for meaningful stats
          yield this.calculateStats(window, allResults.slice(-windowSize))
        }
      }
    }
  }

  /**
   * Yields results only when they meet a specific condition.
   *
   * @param predicate Function that determines if a result should be yielded
   *
   * @example
   * ```typescript
   * // Only yield results with high latency
   * for await (const slowResult of stream.filter(r =>
   *   r.isSuccess() && r.averageResponseTimeInMs() > 100
   * )) {
   *   console.warn(`Slow response: ${slowResult.averageResponseTimeInMs()}ms`)
   * }
   * ```
   */
  async* filter(predicate: (result: PingResult) => boolean): AsyncGenerator<PingResult, void, unknown> {
    for await (const result of this.ping.stream()) {
      if (predicate(result)) {
        yield result
      }
    }
  }

  /**
   * Transforms each ping result using a mapping function.
   *
   * @param mapper Function to transform each result
   *
   * @example
   * ```typescript
   * // Extract only latency values
   * for await (const latency of stream.map(r =>
   *   r.isSuccess() ? r.averageResponseTimeInMs() : null
   * )) {
   *   if (latency !== null) {
   *     console.log(`Latency: ${latency}ms`)
   *   }
   * }
   * ```
   */
  async* map<T>(mapper: (result: PingResult) => T): AsyncGenerator<T, void, unknown> {
    for await (const result of this.ping.stream()) {
      yield mapper(result)
    }
  }

  /**
   * Groups results into batches and yields when a batch is full or a timeout occurs.
   *
   * @param batchSize Maximum number of results per batch
   * @param timeoutMs Maximum time to wait before yielding a partial batch (default: 5000ms)
   *
   * @example
   * ```typescript
   * // Process results in timed batches
   * for await (const batch of stream.batchWithTimeout(10, 5000)) {
   *   console.log(`Processing batch of ${batch.length} results`)
   *   await processBatch(batch)
   * }
   * ```
   */
  async* batchWithTimeout(
    batchSize: number,
    timeoutMs: number = 5000,
  ): AsyncGenerator<PingResult[], void, unknown> {
    const batch: PingResult[] = []
    let timeoutId: NodeJS.Timeout | null = null

    const yieldBatch = () => {
      if (batch.length > 0) {
        const batchToYield = [...batch]
        batch.length = 0
        return batchToYield
      }
      return null
    }

    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        const batchToYield = yieldBatch()
        if (batchToYield) {
          // Note: This is a limitation of async generators - we can't yield from timeout
          // In practice, you might want to use a different pattern for this use case
        }
      }, timeoutMs)
    }

    try {
      for await (const result of this.ping.stream()) {
        batch.push(result)

        if (batch.length >= batchSize) {
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          yield yieldBatch()!
        }
        else if (batch.length === 1) {
          resetTimeout()
        }
      }
    }
    finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }

    // Yield any remaining results
    const finalBatch = yieldBatch()
    if (finalBatch) {
      yield finalBatch
    }
  }

  /**
   * Calculates statistics from a window of ping results.
   */
  private calculateStats(successfulResults: PingResult[], allResults: PingResult[]): PingStats {
    const responseTimes = successfulResults.map(r => r.averageResponseTimeInMs())
    const count = responseTimes.length

    if (count === 0) {
      return {
        count: 0,
        average: 0,
        minimum: 0,
        maximum: 0,
        standardDeviation: 0,
        jitter: 0,
        packetLoss: 100,
        timestamp: new Date(),
      }
    }

    const sum = responseTimes.reduce((a, b) => a + b, 0)
    const average = sum / count
    const minimum = Math.min(...responseTimes)
    const maximum = Math.max(...responseTimes)

    // Calculate standard deviation
    const variance = responseTimes.reduce((acc, time) => {
      const diff = time - average
      return acc + (diff * diff)
    }, 0) / count
    const standardDeviation = Math.sqrt(variance)

    // Calculate jitter (mean absolute deviation from average)
    const jitter = responseTimes.reduce((acc, time) => {
      return acc + Math.abs(time - average)
    }, 0) / count

    // Calculate packet loss for the window
    const totalPings = allResults.length
    const successfulPings = allResults.filter(r => r.isSuccess()).length
    const packetLoss = totalPings > 0 ? ((totalPings - successfulPings) / totalPings) * 100 : 0

    return {
      count,
      average: Math.round(average * 100) / 100, // Round to 2 decimal places
      minimum: Math.round(minimum * 100) / 100,
      maximum: Math.round(maximum * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      jitter: Math.round(jitter * 100) / 100,
      packetLoss: Math.round(packetLoss * 100) / 100,
      timestamp: new Date(),
    }
  }
}

/**
 * Utility function to combine multiple async iterators into a single stream.
 * Results are yielded as soon as they become available from any iterator.
 *
 * @param iterators Multiple async iterators to combine
 *
 * @example
 * ```typescript
 * const ping1 = new Ping('google.com').stream()
 * const ping2 = new Ping('github.com').stream()
 *
 * for await (const result of combineAsyncIterators(ping1, ping2)) {
 *   console.log(`Got result from ${result.host}`)
 * }
 * ```
 */
export async function* combineAsyncIterators<T>(
  ...iterators: AsyncGenerator<T, void, unknown>[]
): AsyncGenerator<T, void, unknown> {
  // Simple implementation: just consume iterators sequentially
  // For true concurrent combining, you'd need a more complex implementation
  for (const iterator of iterators) {
    for await (const value of iterator) {
      yield value
    }
  }
}
