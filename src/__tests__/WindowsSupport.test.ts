import os from 'node:os'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Ping } from '../ping.js'

// Mock os.platform to test Windows-specific behavior
vi.mock('node:os', () => ({
  default: {
    platform: vi.fn(),
  },
}))

const mockOs = vi.mocked(os)

describe('windows support', () => {
  let mockPlatform: any

  beforeEach(() => {
    mockPlatform = mockOs.platform as any
  })

  describe('windows ping command building', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('win32')
    })

    it('should use -n for packet count on Windows', () => {
      const ping = new Ping('example.com').setCount(5)
      const command = ping.buildPingCommand()

      expect(command).toContain('-n')
      expect(command).toContain('5')
      expect(command).not.toContain('-c')
    })

    it('should use -w for timeout on Windows with milliseconds', () => {
      const ping = new Ping('example.com').setTimeout(3)
      const command = ping.buildPingCommand()

      expect(command).toContain('-w')
      expect(command).toContain('3000') // 3 seconds = 3000ms
      expect(command).not.toContain('-W')
    })

    it('should use -l for packet size on Windows', () => {
      const ping = new Ping('example.com').setPacketSize(128)
      const command = ping.buildPingCommand()

      expect(command).toContain('-l')
      expect(command).toContain('128')
      expect(command).not.toContain('-s')
    })

    it('should use -i for TTL on Windows', () => {
      const ping = new Ping('example.com').setTtl(32)
      const command = ping.buildPingCommand()

      expect(command).toContain('-i')
      expect(command).toContain('32')
      expect(command).not.toContain('-t')
    })

    it('should not include interval option on Windows', () => {
      const ping = new Ping('example.com').setInterval(2.0)
      const command = ping.buildPingCommand()

      // Should not contain interval flag since Windows handles this differently
      const intervalIndex = command.indexOf('-i')
      if (intervalIndex !== -1) {
        // If -i is present, it should be for TTL, not interval
        const nextValue = command[intervalIndex + 1]
        expect(nextValue).not.toBe('2') // Should not be the interval value
      }
    })

    it('should build complete Windows ping command', () => {
      const ping = new Ping('google.com')
        .setCount(3)
        .setTimeout(5)
        .setPacketSize(64)
        .setTtl(128)

      const command = ping.buildPingCommand()

      expect(command).toEqual([
        'ping',
        '-n',
        '3', // count
        '-w',
        '5000', // timeout in ms
        '-l',
        '64', // packet size
        '-i',
        '128', // TTL
        'google.com', // hostname
      ])
    })
  })

  describe('macos ping command building', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('darwin')
    })

    it('should use -c for packet count on macOS', () => {
      const ping = new Ping('example.com').setCount(5)
      const command = ping.buildPingCommand()

      expect(command).toContain('-c')
      expect(command).toContain('5')
      expect(command).not.toContain('-n')
    })

    it('should use -W for timeout on macOS with milliseconds', () => {
      const ping = new Ping('example.com').setTimeout(3)
      const command = ping.buildPingCommand()

      expect(command).toContain('-W')
      expect(command).toContain('3000') // 3 seconds = 3000ms on macOS
      expect(command).not.toContain('-w')
    })
  })

  describe('linux ping command building', () => {
    beforeEach(() => {
      mockPlatform.mockReturnValue('linux')
    })

    it('should use -c for packet count on Linux', () => {
      const ping = new Ping('example.com').setCount(5)
      const command = ping.buildPingCommand()

      expect(command).toContain('-c')
      expect(command).toContain('5')
      expect(command).not.toContain('-n')
    })

    it('should use -W for timeout on Linux with seconds', () => {
      const ping = new Ping('example.com').setTimeout(3)
      const command = ping.buildPingCommand()

      expect(command).toContain('-W')
      expect(command).toContain('3') // 3 seconds on Linux
      expect(command).not.toContain('-w')
    })
  })

  describe('platform detection methods', () => {
    it('should detect Windows correctly', () => {
      mockPlatform.mockReturnValue('win32')
      const ping = new Ping('example.com')

      expect(ping.isRunningOnWindows()).toBe(true)
      expect(ping.isRunningOnMacOS()).toBe(false)
    })

    it('should detect macOS correctly', () => {
      mockPlatform.mockReturnValue('darwin')
      const ping = new Ping('example.com')

      expect(ping.isRunningOnWindows()).toBe(false)
      expect(ping.isRunningOnMacOS()).toBe(true)
    })

    it('should detect Linux correctly', () => {
      mockPlatform.mockReturnValue('linux')
      const ping = new Ping('example.com')

      expect(ping.isRunningOnWindows()).toBe(false)
      expect(ping.isRunningOnMacOS()).toBe(false)
    })
  })
})
