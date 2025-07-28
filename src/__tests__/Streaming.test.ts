import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { combineAsyncIterators, PingStream } from '../ping-stream.js'
import { Ping } from '../ping.js'

describe('ping streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create a stream generator', () => {
    const ping = new Ping('google.com').setCount(2).setTimeout(1)
    const stream = ping.stream()

    expect(stream).toBeDefined()
    expect(typeof stream[Symbol.asyncIterator]).toBe('function')
  })

  it('should create streaming methods', () => {
    const ping = new Ping('localhost').setCount(2).setTimeout(1)

    // Test that streaming methods exist and return async generators
    expect(typeof ping.stream()[Symbol.asyncIterator]).toBe('function')
    expect(typeof ping.streamWithFilter(r => r.isSuccess())[Symbol.asyncIterator]).toBe('function')
    expect(typeof ping.streamBatched(2)[Symbol.asyncIterator]).toBe('function')
  })

  it('should handle infinite streams with count 0', () => {
    const ping = new Ping('localhost').setCount(0).setTimeout(1) // infinite
    const stream = ping.stream()

    expect(stream).toBeDefined()
    expect(typeof stream[Symbol.asyncIterator]).toBe('function')
  })

  it('should filter and transform results', () => {
    const ping = new Ping('localhost').setCount(2).setTimeout(1)

    // Test that streamWithFilter exists and returns async generator
    const filteredStream = ping.streamWithFilter(
      r => r.isSuccess(),
      r => r.averageResponseTimeInMs(),
    )

    expect(filteredStream).toBeDefined()
    expect(typeof filteredStream[Symbol.asyncIterator]).toBe('function')
  })

  it('should handle streamBatched method', () => {
    const ping = new Ping('localhost').setCount(4).setTimeout(1)
    const batchedStream = ping.streamBatched(2)

    expect(batchedStream).toBeDefined()
    expect(typeof batchedStream[Symbol.asyncIterator]).toBe('function')
  })

  it('should handle ping method chaining', () => {
    const ping = new Ping('localhost')
      .setCount(2)
      .setTimeout(1)
      .setInterval(0.5)

    expect(ping.stream).toBeDefined()
    expect(ping.streamBatched).toBeDefined()
    expect(ping.streamWithFilter).toBeDefined()
  })
})

describe('pingStream', () => {
  let mockPing: Ping

  beforeEach(() => {
    mockPing = new Ping('test.com').setCount(5).setTimeout(1)
  })

  it('should create PingStream instance', () => {
    const stream = new PingStream(mockPing)

    expect(stream).toBeDefined()
    expect(stream.take).toBeDefined()
    expect(stream.skipFailures).toBeDefined()
    expect(stream.skipSuccesses).toBeDefined()
    expect(stream.window).toBeDefined()
    expect(stream.rollingStats).toBeDefined()
    expect(stream.filter).toBeDefined()
    expect(stream.map).toBeDefined()
    expect(stream.batchWithTimeout).toBeDefined()
  })

  it('should create async generators for all methods', () => {
    const stream = new PingStream(mockPing)

    // Test that all streaming methods return async generators
    expect(typeof stream.take(1)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.skipFailures()[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.skipSuccesses()[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.window(3)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.rollingStats(5)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.filter(() => true)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.map(r => r)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.batchWithTimeout(2)[Symbol.asyncIterator]).toBe('function')
  })

  it('should handle PingStream constructor variations', () => {
    const ping1 = new Ping('localhost').setCount(1).setTimeout(1)
    const ping2 = new Ping('google.com').setCount(0).setTimeout(2) // infinite
    const ping3 = new Ping('example.com').setCount(10).setTimeout(0.5)

    const stream1 = new PingStream(ping1)
    const stream2 = new PingStream(ping2)
    const stream3 = new PingStream(ping3)

    expect(stream1).toBeInstanceOf(PingStream)
    expect(stream2).toBeInstanceOf(PingStream)
    expect(stream3).toBeInstanceOf(PingStream)
  })

  it('should handle method chaining', () => {
    const stream = new PingStream(mockPing)

    // Test that methods exist and are functions
    expect(typeof stream.take).toBe('function')
    expect(typeof stream.filter).toBe('function')
    expect(typeof stream.map).toBe('function')
    expect(typeof stream.skipFailures).toBe('function')
    expect(typeof stream.window).toBe('function')

    // Test that methods return async generators
    expect(typeof stream.take(5)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.filter(() => true)[Symbol.asyncIterator]).toBe('function')
    expect(typeof stream.map(r => r)[Symbol.asyncIterator]).toBe('function')
  })

  it('should handle calculateStats with empty results', () => {
    const stream = new PingStream(mockPing)

    // Test that calculateStats handles empty results
    const emptyStats = (stream as any).calculateStats([], [])
    expect(emptyStats).toEqual({
      count: 0,
      average: 0,
      minimum: 0,
      maximum: 0,
      standardDeviation: 0,
      jitter: 0,
      packetLoss: 100,
      timestamp: expect.any(Date),
    })
  })

  it('should calculate stats correctly with mock data', () => {
    const stream = new PingStream(mockPing)

    // Create mock successful results
    const mockResults = [
      {
        isSuccess: () => true,
        averageResponseTimeInMs: () => 10,
        success: true,
      } as any,
      {
        isSuccess: () => true,
        averageResponseTimeInMs: () => 20,
        success: true,
      } as any,
      {
        isSuccess: () => true,
        averageResponseTimeInMs: () => 30,
        success: true,
      } as any,
    ]

    const stats = (stream as any).calculateStats(mockResults, mockResults)

    expect(stats.count).toBe(3)
    expect(stats.average).toBe(20) // (10+20+30)/3
    expect(stats.minimum).toBe(10)
    expect(stats.maximum).toBe(30)
    expect(stats.packetLoss).toBe(0) // All successful
    expect(stats.standardDeviation).toBeGreaterThan(0)
    expect(stats.jitter).toBeGreaterThan(0)
    expect(stats.timestamp).toBeInstanceOf(Date)
  })

  it('should calculate packet loss correctly', () => {
    const stream = new PingStream(mockPing)

    const successfulResults = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 10 } as any,
    ]

    const allResults = [
      { isSuccess: () => true } as any,
      { isSuccess: () => false } as any, // Failed ping
    ]

    const stats = (stream as any).calculateStats(successfulResults, allResults)
    expect(stats.packetLoss).toBe(50) // 1 failed out of 2 total
  })

  it('should handle stats with single result', () => {
    const stream = new PingStream(mockPing)

    const singleResult = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 15 } as any,
    ]

    const stats = (stream as any).calculateStats(singleResult, singleResult)
    expect(stats.count).toBe(1)
    expect(stats.average).toBe(15)
    expect(stats.minimum).toBe(15)
    expect(stats.maximum).toBe(15)
    expect(stats.standardDeviation).toBe(0) // No variance with single value
    expect(stats.jitter).toBe(0) // No jitter with single value
  })

  it('should handle mixed success/failure packet loss', () => {
    const stream = new PingStream(mockPing)

    const mixedSuccessful = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 10 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 20 } as any,
    ]

    const mixedAll = [
      { isSuccess: () => true } as any,
      { isSuccess: () => false } as any,
      { isSuccess: () => true } as any,
      { isSuccess: () => false } as any,
      { isSuccess: () => false } as any,
    ]

    const stats = (stream as any).calculateStats(mixedSuccessful, mixedAll)
    expect(stats.packetLoss).toBe(60) // 3 failed out of 5 total
    expect(stats.count).toBe(2) // Only successful ones counted
  })

  it('should handle calculateStats with varying response times', () => {
    const stream = new PingStream(mockPing)

    const varyingResults = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 5 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 15 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 25 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 35 } as any,
    ]

    const stats = (stream as any).calculateStats(varyingResults, varyingResults)
    expect(stats.count).toBe(4)
    expect(stats.average).toBe(20) // (5+15+25+35)/4
    expect(stats.minimum).toBe(5)
    expect(stats.maximum).toBe(35)
    expect(stats.standardDeviation).toBeGreaterThan(10)
    expect(stats.jitter).toBeGreaterThan(5)
    expect(stats.packetLoss).toBe(0)
  })
})

describe('combineAsyncIterators', () => {
  it('should combine multiple iterators', async () => {
    // Create simple mock async generators
    async function* generator1() {
      yield 1
      yield 2
    }

    async function* generator2() {
      yield 3
      yield 4
    }

    const combined = combineAsyncIterators(generator1(), generator2())
    const results: number[] = []

    for await (const value of combined) {
      results.push(value)
    }

    expect(results).toEqual([1, 2, 3, 4])
  })

  it('should handle empty iterators', async () => {
    async function* emptyGenerator() {
      // Yields nothing
    }

    const combined = combineAsyncIterators(emptyGenerator(), emptyGenerator())
    const results: any[] = []

    for await (const value of combined) {
      results.push(value)
    }

    expect(results).toEqual([])
  })

  it('should handle single iterator', async () => {
    async function* singleGenerator() {
      yield 'test'
    }

    const combined = combineAsyncIterators(singleGenerator())
    const results: string[] = []

    for await (const value of combined) {
      results.push(value)
    }

    expect(results).toEqual(['test'])
  })

  it('should handle multiple empty and non-empty iterators', async () => {
    async function* emptyGenerator() {
      // Yields nothing
    }

    async function* nonEmptyGenerator() {
      yield 'value1'
      yield 'value2'
    }

    const combined = combineAsyncIterators(
      emptyGenerator(),
      nonEmptyGenerator(),
      emptyGenerator(),
    )
    const results: string[] = []

    for await (const value of combined) {
      results.push(value)
    }

    expect(results).toEqual(['value1', 'value2'])
  })

  it('should handle iterator exceptions', async () => {
    async function* throwingGenerator() {
      yield 1
      throw new Error('Generator error')
    }

    async function* normalGenerator() {
      yield 2
      yield 3
    }

    const combined = combineAsyncIterators(throwingGenerator(), normalGenerator())
    const results: number[] = []

    try {
      for await (const value of combined) {
        results.push(value)
      }
    }
    catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toBe('Generator error')
    }

    // When an exception occurs, we should have at least the first value
    expect(results).toContain(1)
    // The second generator might not have been processed due to the error
    expect(results.length).toBeGreaterThan(0)
  })

  it('should handle async generators with different yields', async () => {
    async function* slowGenerator() {
      await new Promise(resolve => setTimeout(resolve, 1))
      yield 'slow1'
      await new Promise(resolve => setTimeout(resolve, 1))
      yield 'slow2'
    }

    async function* fastGenerator() {
      yield 'fast1'
      yield 'fast2'
    }

    const combined = combineAsyncIterators(slowGenerator(), fastGenerator())
    const results: string[] = []

    for await (const value of combined) {
      results.push(value)
    }

    expect(results).toEqual(['slow1', 'slow2', 'fast1', 'fast2'])
  })

  it('should handle generators that complete at different times', async () => {
    async function* shortGenerator() {
      yield 'short'
    }

    async function* longGenerator() {
      yield 'long1'
      yield 'long2'
      yield 'long3'
    }

    const combined = combineAsyncIterators(shortGenerator(), longGenerator())
    const results: string[] = []

    for await (const value of combined) {
      results.push(value)
    }

    expect(results).toEqual(['short', 'long1', 'long2', 'long3'])
  })
})

describe('ping streaming edge cases', () => {
  it('should handle PingStream with different ping configurations', () => {
    const pingConfigs = [
      new Ping('localhost').setCount(1).setTimeout(1),
      new Ping('google.com').setCount(0).setTimeout(2).setInterval(1), // infinite
      new Ping('example.org').setCount(5).setTimeout(0.5).setInterval(0.2),
    ]

    pingConfigs.forEach((ping) => {
      const stream = new PingStream(ping)
      expect(stream).toBeInstanceOf(PingStream)
      expect(stream.take).toBeDefined()
      expect(stream.window).toBeDefined()
      expect(stream.filter).toBeDefined()
    })
  })

  it('should handle edge case stats calculations', () => {
    const stream = new PingStream(new Ping('test.com'))

    // Test with zero total pings
    const stats1 = (stream as any).calculateStats([], [])
    expect(stats1.packetLoss).toBe(100)

    // Test all failures
    const noSuccessful: any[] = []
    const allFailures = [
      { isSuccess: () => false } as any,
      { isSuccess: () => false } as any,
    ]
    const stats2 = (stream as any).calculateStats(noSuccessful, allFailures)
    expect(stats2.packetLoss).toBe(100)
    expect(stats2.count).toBe(0)
    expect(stats2.average).toBe(0)

    // Test all successes
    const allSuccessful = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 10 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 20 } as any,
    ]
    const stats3 = (stream as any).calculateStats(allSuccessful, allSuccessful)
    expect(stats3.packetLoss).toBe(0)
    expect(stats3.count).toBe(2)
    expect(stats3.average).toBe(15)
  })

  it('should handle standard deviation and jitter calculations', () => {
    const stream = new PingStream(new Ping('test.com'))

    // Test with identical values (no deviation)
    const identicalResults = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 10 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 10 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 10 } as any,
    ]
    const identicalStats = (stream as any).calculateStats(identicalResults, identicalResults)
    expect(identicalStats.standardDeviation).toBe(0)
    expect(identicalStats.jitter).toBe(0)

    // Test with varied values
    const variedResults = [
      { isSuccess: () => true, averageResponseTimeInMs: () => 1 } as any,
      { isSuccess: () => true, averageResponseTimeInMs: () => 100 } as any,
    ]
    const variedStats = (stream as any).calculateStats(variedResults, variedResults)
    expect(variedStats.standardDeviation).toBeGreaterThan(0)
    expect(variedStats.jitter).toBeGreaterThan(0)
  })
})
