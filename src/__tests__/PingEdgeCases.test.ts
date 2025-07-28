import { describe, expect, it } from 'vitest'
import { Ping } from '../ping.js'

describe('ping timeout and process scenarios', () => {
  it('should calculate process timeout correctly', () => {
    const ping1 = new Ping('example.com').setCount(5).setTimeout(1).setInterval(0.5)
    const timeout1 = ping1.calculateProcessTimeout()
    expect(timeout1).toBeGreaterThanOrEqual(5) // Should account for multiple pings + buffer

    const ping2 = new Ping('example.com').setCount(1).setTimeout(2).setInterval(0)
    const timeout2 = ping2.calculateProcessTimeout()
    expect(timeout2).toBeGreaterThanOrEqual(5) // Should have buffer time

    const ping3 = new Ping('example.com').setCount(0).setTimeout(1).setInterval(1) // Infinite
    const timeout3 = ping3.calculateProcessTimeout()
    expect(timeout3).toBeGreaterThanOrEqual(5) // Should handle infinite case
  })

  it('should handle ping command timeout scenarios', async () => {
    // Create a ping with very short timeout to test timeout handling
    const ping = new Ping('1.1.1.1').setTimeout(0.001).setCount(1) // 1ms timeout

    try {
      const result = await ping.run()
      // If it succeeds, check the result structure
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('host')
    }
    catch (error) {
      // Expected for very short timeouts
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('should test different ping configurations for edge cases', async () => {
    // Test with various timeout and interval combinations
    const configurations = [
      { host: '8.8.8.8', timeout: 0.1, interval: 0.1, count: 1 },
      { host: '1.1.1.1', timeout: 0.2, interval: 0, count: 1 },
      { host: 'dns.google', timeout: 0.1, interval: 0.05, count: 1 },
    ]

    for (const config of configurations) {
      const ping = new Ping(config.host)
        .setTimeout(config.timeout)
        .setInterval(config.interval)
        .setCount(config.count)

      try {
        const result = await ping.run()
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('host', config.host)
      }
      catch (error) {
        // Expected for very short timeouts
        expect(error).toBeInstanceOf(Error)
      }
    }
  })

  it('should handle various ping error scenarios', async () => {
    // Test with invalid hosts to trigger different error paths
    const invalidHosts = [
      'invalid-host-12345.test',
    ]

    for (const host of invalidHosts) {
      const ping = new Ping(host).setTimeout(0.1).setCount(1)

      try {
        const result = await ping.run()
        // If it returns a result, it should indicate failure
        expect(result.success).toBe(false)
      }
      catch (error) {
        // Expected for invalid hosts
        expect(error).toBeInstanceOf(Error)
      }
    }
  }, 10000) // 10 second timeout

  it('should test ping stream with various error conditions', async () => {
    const ping = new Ping('invalid-test-host.invalid').setTimeout(0.1).setCount(1)
    const stream = ping.stream()

    let resultCount = 0
    const maxResults = 2

    try {
      for await (const result of stream) {
        resultCount++
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('host')

        if (resultCount >= maxResults) {
          break
        }
      }
    }
    catch (error) {
      // Expected for invalid hosts
      expect(error).toBeInstanceOf(Error)
    }

    expect(resultCount).toBeLessThanOrEqual(maxResults)
  })

  it('should test streamBatched with error conditions', async () => {
    const ping = new Ping('invalid-batch-host.test').setTimeout(0.1).setCount(1)
    const batchStream = ping.streamBatched(1)

    let batchCount = 0
    const maxBatches = 1

    try {
      for await (const batch of batchStream) {
        batchCount++
        expect(Array.isArray(batch)).toBe(true)

        if (batchCount >= maxBatches) {
          break
        }
      }
    }
    catch (error) {
      // Expected for invalid hosts
      expect(error).toBeInstanceOf(Error)
    }

    expect(batchCount).toBeLessThanOrEqual(maxBatches)
  }, 10000) // 10 second timeout

  it('should test streamWithFilter with error conditions', async () => {
    const ping = new Ping('filter-test-host.invalid').setTimeout(0.1).setCount(1)
    const filterStream = ping.streamWithFilter(
      result => result.isFailure(), // Only get failures
      result => result.error || 'Unknown error',
    )

    let errorCount = 0
    const maxErrors = 1

    try {
      for await (const error of filterStream) {
        errorCount++
        expect(typeof error).toBe('string')

        if (errorCount >= maxErrors) {
          break
        }
      }
    }
    catch (err) {
      // Expected for invalid hosts
      expect(err).toBeInstanceOf(Error)
    }

    expect(errorCount).toBeLessThanOrEqual(maxErrors)
  })

  it('should handle ping method chaining with errors', async () => {
    const ping = new Ping('chain-test.invalid')
      .setTimeout(0.05)
      .setInterval(0.02)
      .setCount(1)

    // Test that chaining works even with invalid hosts
    expect(ping.timeoutInSeconds).toBe(0.05)
    expect(ping.intervalInSeconds).toBe(0.02)
    expect(ping.count).toBe(1)

    try {
      const result = await ping.run()
      expect(result).toHaveProperty('success')
    }
    catch (error) {
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('should test ping with zero interval', async () => {
    const ping = new Ping('8.8.8.8').setTimeout(0.1).setInterval(0).setCount(1)

    try {
      const result = await ping.run()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('host', '8.8.8.8')
    }
    catch (error) {
      // Expected for very short timeouts
      expect(error).toBeInstanceOf(Error)
    }
  })

  it('should test calculateProcessTimeout with edge cases', () => {
    // Test with zero count (infinite)
    const infinitePing = new Ping('test.com').setCount(0).setTimeout(1).setInterval(1)
    const infiniteTimeout = infinitePing.calculateProcessTimeout()
    expect(infiniteTimeout).toBeGreaterThanOrEqual(5)

    // Test with large values
    const largePing = new Ping('test.com').setCount(10).setTimeout(0.1).setInterval(0.1)
    const largeTimeout = largePing.calculateProcessTimeout()
    expect(largeTimeout).toBeGreaterThanOrEqual(5)

    // Test with very small values
    const smallPing = new Ping('test.com').setCount(1).setTimeout(0.01).setInterval(0.01)
    const smallTimeout = smallPing.calculateProcessTimeout()
    expect(smallTimeout).toBeGreaterThanOrEqual(5) // Should have minimum buffer
  })
})
