import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import { Ping } from '../ping'

// Mock the dependencies
vi.mock('node:child_process')
vi.mock('node:os')

const mockSpawnSync = vi.mocked(spawnSync)
const mockOs = vi.mocked(os)

describe('Ping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default OS to non-macOS
    mockOs.platform.mockReturnValue('linux')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create a Ping instance with default values', () => {
      const ping = new Ping('google.com')

      expect(ping.hostname).toBe('google.com')
      expect(ping.timeoutInSeconds).toBe(5)
      expect(ping.count).toBe(1)
      expect(ping.intervalInSeconds).toBe(1.0)
      expect(ping.packetSizeInBytes).toBe(56)
      expect(ping.ttl).toBe(64)
      expect(ping.showLostPackets).toBe(true)
    })

    it('should create a Ping instance with custom values', () => {
      const ping = new Ping('example.com', 10, 3, 2.0, 128, 32, false)

      expect(ping.hostname).toBe('example.com')
      expect(ping.timeoutInSeconds).toBe(10)
      expect(ping.count).toBe(3)
      expect(ping.intervalInSeconds).toBe(2.0)
      expect(ping.packetSizeInBytes).toBe(128)
      expect(ping.ttl).toBe(32)
      expect(ping.showLostPackets).toBe(false)
    })
  })

  describe('fluent interface methods', () => {
    let ping: Ping

    beforeEach(() => {
      ping = new Ping('google.com')
    })

    it('should set timeout and return this', () => {
      const result = ping.setTimeout(10)

      expect(result).toBe(ping)
      expect(ping.timeoutInSeconds).toBe(10)
    })

    it('should set count and return this', () => {
      const result = ping.setCount(5)

      expect(result).toBe(ping)
      expect(ping.count).toBe(5)
    })

    it('should set interval and return this', () => {
      const result = ping.setInterval(2.5)

      expect(result).toBe(ping)
      expect(ping.intervalInSeconds).toBe(2.5)
    })

    it('should set packet size and return this', () => {
      const result = ping.setPacketSize(128)

      expect(result).toBe(ping)
      expect(ping.packetSizeInBytes).toBe(128)
    })

    it('should set TTL and return this', () => {
      const result = ping.setTtl(32)

      expect(result).toBe(ping)
      expect(ping.ttl).toBe(32)
    })

    it('should set show lost packets and return this', () => {
      const result = ping.setShowLostPackets(false)

      expect(result).toBe(ping)
      expect(ping.showLostPackets).toBe(false)
    })

    it('should allow method chaining', () => {
      const result = ping
        .setTimeout(10)
        .setCount(3)
        .setInterval(2.0)
        .setPacketSize(128)
        .setTtl(32)
        .setShowLostPackets(false)

      expect(result).toBe(ping)
      expect(ping.timeoutInSeconds).toBe(10)
      expect(ping.count).toBe(3)
      expect(ping.intervalInSeconds).toBe(2.0)
      expect(ping.packetSizeInBytes).toBe(128)
      expect(ping.ttl).toBe(32)
      expect(ping.showLostPackets).toBe(false)
    })
  })

  describe('buildPingCommand', () => {
    it('should build basic ping command with default values', () => {
      const ping = new Ping('google.com')
      const command = ping.buildPingCommand()

      expect(command).toEqual([
        'ping',
        '-c', '1',
        '-W', '5',
        '-O',
        'google.com'
      ])
    })

    it('should build ping command with custom count and timeout', () => {
      const ping = new Ping('google.com').setCount(3).setTimeout(10)
      const command = ping.buildPingCommand()

      expect(command).toEqual([
        'ping',
        '-c', '3',
        '-W', '10',
        '-O',
        'google.com'
      ])
    })

    it('should include interval option when not default', () => {
      const ping = new Ping('google.com').setInterval(2.0)
      const command = ping.buildPingCommand()

      expect(command).toContain('-i')
      expect(command).toContain('2')
    })

    it('should include packet size option when not default', () => {
      const ping = new Ping('google.com').setPacketSize(128)
      const command = ping.buildPingCommand()

      expect(command).toContain('-s')
      expect(command).toContain('128')
    })

    it('should include TTL option when not default', () => {
      const ping = new Ping('google.com').setTtl(32)
      const command = ping.buildPingCommand()

      expect(command).toContain('-t')
      expect(command).toContain('32')
    })

    it('should include show lost packets option on non-macOS when enabled', () => {
      mockOs.platform.mockReturnValue('linux')
      const ping = new Ping('google.com').setShowLostPackets(true)
      const command = ping.buildPingCommand()

      expect(command).toContain('-O')
    })

    it('should not include show lost packets option on macOS', () => {
      mockOs.platform.mockReturnValue('darwin')
      const ping = new Ping('google.com').setShowLostPackets(true)
      const command = ping.buildPingCommand()

      expect(command).not.toContain('-O')
    })

    it('should use milliseconds for timeout on macOS', () => {
      mockOs.platform.mockReturnValue('darwin')
      const ping = new Ping('google.com').setTimeout(5)
      const command = ping.buildPingCommand()

      expect(command).toContain('-W')
      expect(command).toContain('5000') // 5 seconds = 5000 milliseconds
    })

    it('should use seconds for timeout on non-macOS', () => {
      mockOs.platform.mockReturnValue('linux')
      const ping = new Ping('google.com').setTimeout(5)
      const command = ping.buildPingCommand()

      expect(command).toContain('-W')
      expect(command).toContain('5')
    })
  })

  describe('calculateProcessTimeout', () => {
    it('should calculate timeout for single ping', () => {
      const ping = new Ping('google.com').setCount(1).setTimeout(5).setInterval(1)
      const timeout = ping.calculateProcessTimeout()

      // (1 * (5 + 1)) + 5 = 11
      expect(timeout).toBe(11)
    })

    it('should calculate timeout for multiple pings', () => {
      const ping = new Ping('google.com').setCount(3).setTimeout(5).setInterval(1)
      const timeout = ping.calculateProcessTimeout()

      // (3 * (5 + 1)) + 5 = 23
      expect(timeout).toBe(23)
    })

    it('should handle fractional intervals', () => {
      const ping = new Ping('google.com').setCount(2).setTimeout(3).setInterval(0.5)
      const timeout = ping.calculateProcessTimeout()

      // Math.ceil(2 * (3 + 0.5)) + 5 = Math.ceil(7) + 5 = 12
      expect(timeout).toBe(12)
    })
  })

  describe('combineOutputLines', () => {
    it('should combine stdout and stderr lines', () => {
      const ping = new Ping('google.com')
      const mockResult = {
        stdout: 'line1\nline2\n',
        stderr: 'error1\nerror2\n',
        status: 0
      } as any

      const combined = ping.combineOutputLines(mockResult)

      expect(combined).toEqual(['line1', 'line2', 'error1', 'error2'])
    })

    it('should handle empty stdout', () => {
      const ping = new Ping('google.com')
      const mockResult = {
        stdout: '',
        stderr: 'error1\nerror2\n',
        status: 0
      } as any

      const combined = ping.combineOutputLines(mockResult)

      expect(combined).toEqual(['error1', 'error2'])
    })

    it('should handle empty stderr', () => {
      const ping = new Ping('google.com')
      const mockResult = {
        stdout: 'line1\nline2\n',
        stderr: '',
        status: 0
      } as any

      const combined = ping.combineOutputLines(mockResult)

      expect(combined).toEqual(['line1', 'line2'])
    })

    it('should filter out empty lines', () => {
      const ping = new Ping('google.com')
      const mockResult = {
        stdout: 'line1\n\nline2\n',
        stderr: 'error1\n\n',
        status: 0
      } as any

      const combined = ping.combineOutputLines(mockResult)

      expect(combined).toEqual(['line1', 'line2', 'error1'])
    })

    it('should handle null stdout and stderr', () => {
      const ping = new Ping('google.com')
      const mockResult = {
        stdout: null,
        stderr: null,
        status: 1
      } as any

      const combined = ping.combineOutputLines(mockResult)

      expect(combined).toEqual([])
    })
  })

  describe('run', () => {
    it('should execute ping command and return result', () => {
      const mockOutput = [
        'PING google.com (142.250.185.110): 56 data bytes',
        '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
        '',
        '--- google.com ping statistics ---',
        '1 packets transmitted, 1 received, 0% packet loss'
      ]

      mockSpawnSync.mockReturnValue({
        stdout: mockOutput.join('\n'),
        stderr: '',
        status: 0,
        signal: null,
        error: undefined,
        pid: 12345,
        output: [null, Buffer.from(mockOutput.join('\n')), Buffer.from('')]
      })

      const ping = new Ping('google.com')
      const result = ping.run()

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'ping',
        ['-c', '1', '-W', '5', '-O', 'google.com'],
        expect.objectContaining({
          encoding: 'utf-8',
          timeout: expect.any(Number)
        })
      )

      expect(result.isSuccess()).toBe(true)
      expect(result.host).toBe('google.com')
    })

    it('should handle ping command failure', () => {
      mockSpawnSync.mockReturnValue({
        stdout: '',
        stderr: 'ping: unknown host example.com',
        status: 1,
        signal: null,
        error: undefined,
        pid: 12345,
        output: [null, Buffer.from(''), Buffer.from('ping: unknown host example.com')]
      })

      const ping = new Ping('example.com')
      const result = ping.run()

      expect(result.isFailure()).toBe(true)
      expect(result.host).toBe('example.com')
    })

    it('should handle null status as failure', () => {
      mockSpawnSync.mockReturnValue({
        stdout: '',
        stderr: 'command failed',
        status: null,
        signal: 'SIGTERM',
        error: undefined,
        pid: 12345,
        output: [null, Buffer.from(''), Buffer.from('command failed')]
      })

      const ping = new Ping('example.com')
      const result = ping.run()

      expect(result.isFailure()).toBe(true)
    })
  })

  describe('runAsync', () => {
    it('should execute ping command asynchronously and return result', async () => {
      const mockOutput = [
        'PING google.com (142.250.185.110): 56 data bytes',
        '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
        '',
        '--- google.com ping statistics ---',
        '1 packets transmitted, 1 received, 0% packet loss'
      ]

      // Mock the executePingCommandAsync method
      const ping = new Ping('google.com')
      const mockResult = {
        stdout: mockOutput.join('\n'),
        stderr: '',
        status: 0,
        signal: null,
        error: undefined,
        pid: 12345,
        output: [null, mockOutput.join('\n'), '']
      }

      vi.spyOn(ping, 'executePingCommandAsync').mockResolvedValue(mockResult)

      const result = await ping.runAsync()

      expect(result.isSuccess()).toBe(true)
      expect(result.host).toBe('google.com')
    })

    it('should handle async ping command failure', async () => {
      const ping = new Ping('example.com')
      const mockResult = {
        stdout: '',
        stderr: 'ping: unknown host example.com',
        status: 1,
        signal: null,
        error: undefined,
        pid: 12345,
        output: [null, '', 'ping: unknown host example.com']
      }

      vi.spyOn(ping, 'executePingCommandAsync').mockResolvedValue(mockResult)

      const result = await ping.runAsync()

      expect(result.isFailure()).toBe(true)
      expect(result.host).toBe('example.com')
    })

    it('should handle async timeout rejection', async () => {
      const ping = new Ping('example.com')
      
      vi.spyOn(ping, 'executePingCommandAsync').mockRejectedValue(new Error('Ping command timed out after 11000ms'))

      await expect(ping.runAsync()).rejects.toThrow('Ping command timed out after 11000ms')
    })
  })

  describe('utility methods', () => {
    describe('isRunningOnMacOS', () => {
      it('should return true on darwin platform', () => {
        mockOs.platform.mockReturnValue('darwin')
        const ping = new Ping('google.com')

        expect(ping.isRunningOnMacOS()).toBe(true)
      })

      it('should return false on non-darwin platforms', () => {
        mockOs.platform.mockReturnValue('linux')
        const ping = new Ping('google.com')

        expect(ping.isRunningOnMacOS()).toBe(false)
      })
    })

    describe('convertTimeoutToMilliseconds', () => {
      it('should convert seconds to milliseconds', () => {
        const ping = new Ping('google.com').setTimeout(5)

        expect(ping.convertTimeoutToMilliseconds()).toBe(5000)
      })

      it('should handle fractional seconds', () => {
        const ping = new Ping('google.com').setTimeout(2.5)

        expect(ping.convertTimeoutToMilliseconds()).toBe(2500)
      })
    })
  })
})
