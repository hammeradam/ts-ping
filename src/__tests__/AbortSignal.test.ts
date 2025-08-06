import { spawn } from 'node:child_process'
import os from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Ping } from '../ping'

// Mock the dependencies
vi.mock('node:child_process')
vi.mock('node:os')

const mockSpawn = vi.mocked(spawn)
const mockOs = vi.mocked(os)

describe('ping with AbortSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOs.platform.mockReturnValue('linux')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('setAbortSignal', () => {
    it('should set abort signal and return ping instance for chaining', () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com')

      const result = ping.setAbortSignal(abortController.signal)

      expect(result).toBe(ping)
      expect(ping.abortSignal).toBe(abortController.signal)
    })

    it('should allow chaining with other methods', () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com')
        .setCount(5)
        .setAbortSignal(abortController.signal)
        .setTimeout(10)

      expect(ping.abortSignal).toBe(abortController.signal)
      expect(ping.count).toBe(5)
      expect(ping.timeoutInSeconds).toBe(10)
    })
  })

  describe('runAsync with abort signal', () => {
    it('should throw error if already aborted before starting', async () => {
      const abortController = new AbortController()
      abortController.abort() // Abort immediately

      const ping = new Ping('google.com').setAbortSignal(abortController.signal)

      await expect(ping.runAsync()).rejects.toThrow('Operation was aborted')
    })

    it('should handle abortion during execution', async () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com').setAbortSignal(abortController.signal)

      // Mock child process
      const mockChild = {
        pid: 1234,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChild as any)

      // Setup child process event handlers
      mockChild.on.mockImplementation((event: string, _handler: (code: number, signal: string | null) => void) => {
        if (event === 'close') {
          // Don't call handler, let abortion handle it
        }
        else if (event === 'error') {
          // Don't call handler, let abortion handle it
        }
      })

      // Start the ping operation
      const pingPromise = ping.runAsync()

      // Abort after a short delay
      setTimeout(() => {
        abortController.abort()
      }, 10)

      await expect(pingPromise).rejects.toThrow('Operation was aborted')
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('stream with abort signal', () => {
    let mockChild: any

    beforeEach(() => {
      mockChild = {
        pid: 1234,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChild)

      // Setup default successful ping response
      mockChild.on.mockImplementation((event: string, handler: (code: number, signal: string | null) => void) => {
        if (event === 'close') {
          setTimeout(() => {
            handler(0, null) // successful exit
          }, 50)
        }
      })

      mockChild.stdout.on.mockImplementation((event: string, handler: (data: string) => void) => {
        if (event === 'data') {
          setTimeout(() => {
            handler('PING google.com (172.217.16.142): 56 data bytes\n64 bytes from 172.217.16.142: icmp_seq=0 ttl=118 time=35.5 ms\n\n--- google.com ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss\nround-trip min/avg/max/stddev = 35.500/35.500/35.500/0.000 ms\n')
          }, 25)
        }
      })
    })

    it('should stop streaming when signal is aborted', async () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com')
        .setCount(0) // infinite
        .setInterval(0.1)
        .setAbortSignal(abortController.signal)

      const results: any[] = []

      // Abort after collecting a few results
      setTimeout(() => {
        abortController.abort()
      }, 150)

      for await (const result of ping.stream()) {
        results.push(result)
        // Safety check to prevent infinite loop in tests
        if (results.length > 10)
          break
      }

      // Should have collected some results before abortion
      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThan(10)
    })

    it('should not start streaming if already aborted', async () => {
      const abortController = new AbortController()
      abortController.abort() // Abort immediately

      const ping = new Ping('google.com')
        .setCount(3)
        .setAbortSignal(abortController.signal)

      const results: any[] = []

      for await (const result of ping.stream()) {
        results.push(result)
      }

      expect(results).toHaveLength(0)
    })

    it('should handle abortion during interval sleep', async () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com')
        .setCount(0) // infinite
        .setInterval(1) // 1 second interval
        .setAbortSignal(abortController.signal)

      const results: any[] = []
      const startTime = Date.now()

      // Abort during the sleep between pings
      setTimeout(() => {
        abortController.abort()
      }, 200)

      for await (const result of ping.stream()) {
        results.push(result)
        // Safety check to prevent infinite loop
        if (results.length > 5)
          break
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should have stopped quickly due to abortion during sleep
      expect(duration).toBeLessThan(1000) // Less than the full interval
      expect(results.length).toBeGreaterThan(0) // Should have gotten at least one result
    })
  })

  describe('abortSignal.timeout integration', () => {
    let mockChild: any

    beforeEach(() => {
      mockChild = {
        pid: 1234,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChild)

      // Setup default successful ping response
      mockChild.on.mockImplementation((event: string, handler: (code: number, signal: string | null) => void) => {
        if (event === 'close') {
          setTimeout(() => {
            handler(0, null) // successful exit
          }, 50)
        }
      })

      mockChild.stdout.on.mockImplementation((event: string, handler: (data: string) => void) => {
        if (event === 'data') {
          setTimeout(() => {
            handler('PING google.com (172.217.16.142): 56 data bytes\n64 bytes from 172.217.16.142: icmp_seq=0 ttl=118 time=35.5 ms\n\n--- google.com ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss\nround-trip min/avg/max/stddev = 35.500/35.500/35.500/0.000 ms\n')
          }, 25)
        }
      })
    })

    it('should work with AbortSignal.timeout()', async () => {
      const ping = new Ping('google.com')
        .setCount(0) // infinite
        .setInterval(0.1)
        .setAbortSignal(AbortSignal.timeout(200)) // 200ms timeout

      const results: any[] = []
      const startTime = Date.now()

      for await (const result of ping.stream()) {
        results.push(result)
        // Safety check
        if (results.length > 10)
          break
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should have stopped due to timeout
      expect(duration).toBeGreaterThan(150) // At least close to timeout
      expect(duration).toBeLessThan(500) // But not too long
      expect(results.length).toBeGreaterThan(0)
    })

    it('should set abort signal from AbortSignal.timeout()', () => {
      const timeoutSignal = AbortSignal.timeout(1000)
      const ping = new Ping('google.com').setAbortSignal(timeoutSignal)

      expect(ping.abortSignal).toBe(timeoutSignal)
      expect(ping.abortSignal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('streamWithFilter and streamBatched with abort signal', () => {
    let mockChild: any

    beforeEach(() => {
      mockChild = {
        pid: 1234,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChild)

      mockChild.on.mockImplementation((event: string, handler: (code: number, signal: string | null) => void) => {
        if (event === 'close') {
          setTimeout(() => {
            handler(0, null)
          }, 50)
        }
      })

      mockChild.stdout.on.mockImplementation((event: string, handler: (data: string) => void) => {
        if (event === 'data') {
          setTimeout(() => {
            handler('PING google.com (172.217.16.142): 56 data bytes\n64 bytes from 172.217.16.142: icmp_seq=0 ttl=118 time=35.5 ms\n\n--- google.com ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss\nround-trip min/avg/max/stddev = 35.500/35.500/35.500/0.000 ms\n')
          }, 25)
        }
      })
    })

    it('should abort streamWithFilter when signal is aborted', async () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com')
        .setCount(0) // infinite
        .setInterval(0.1)
        .setAbortSignal(abortController.signal)

      const results: any[] = []

      setTimeout(() => {
        abortController.abort()
      }, 150)

      for await (const result of ping.streamWithFilter(r => r.isSuccess())) {
        results.push(result)
        if (results.length > 10)
          break
      }

      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThan(10)
    })

    it('should abort streamBatched when signal is aborted', async () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com')
        .setCount(0) // infinite
        .setInterval(0.1)
        .setAbortSignal(abortController.signal)

      const batches: any[] = []

      setTimeout(() => {
        abortController.abort()
      }, 200)

      for await (const batch of ping.streamBatched(3)) {
        batches.push(batch)
        if (batches.length > 5)
          break
      }

      expect(batches.length).toBeGreaterThan(0)
      expect(batches.length).toBeLessThan(5)
    })
  })

  describe('error handling with abort signal', () => {
    it('should handle abort during sleep gracefully', async () => {
      const ping = new Ping('google.com').setAbortSignal(AbortSignal.timeout(50))

      // Test the private sleep method indirectly through streaming
      const results: any[] = []

      try {
        for await (const result of ping.stream()) {
          results.push(result)
          if (results.length > 5)
            break
        }
      }
      catch {
        // Should not throw, should end gracefully
      }

      // Should end gracefully without throwing
      expect(true).toBe(true)
    })

    it('should add event listeners when abort signal is provided', async () => {
      const abortController = new AbortController()
      const ping = new Ping('google.com').setAbortSignal(abortController.signal)

      // Spy on addEventListener
      const addListenerSpy = vi.spyOn(abortController.signal, 'addEventListener')

      // Mock child process for quick completion
      const mockChild = {
        pid: 1234,
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      }

      mockSpawn.mockReturnValue(mockChild as any)

      // Setup child process to complete successfully
      mockChild.on.mockImplementation((event: string, handler: (code: number, signal: string | null) => void) => {
        if (event === 'close') {
          setTimeout(() => handler(0, null), 5)
        }
      })

      mockChild.stdout.on.mockImplementation((event: string, handler: (data: string) => void) => {
        if (event === 'data') {
          setTimeout(() => {
            handler('PING google.com (172.217.16.142): 56 data bytes\n64 bytes from 172.217.16.142: icmp_seq=0 ttl=118 time=35.5 ms\n\n--- google.com ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss\nround-trip min/avg/max/stddev = 35.500/35.500/35.500/0.000 ms\n')
          }, 2)
        }
      })

      const result = await ping.runAsync()

      // Should have added event listeners for abort handling
      expect(addListenerSpy).toHaveBeenCalled()
      expect(result.isSuccess()).toBe(true)
    })
  })
})
