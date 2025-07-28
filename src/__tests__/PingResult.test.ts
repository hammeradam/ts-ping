import { describe, it, expect, vi } from 'vitest'
import { PingResult, PingError, PingResultLine } from '../ping-result'

interface PingResultOptions {
  output: string[]
  returnCode: number
  host: string
  timeout: number
  interval: number
  packetSize: number
  ttl: number
}

describe('PingResult', () => {
  describe('fromPingOutput', () => {
    it('should create a failed result when returnCode is non-zero', () => {
      const options: PingResultOptions = {
        output: ['ping: unknown host google.com'],
        returnCode: 1,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)

      expect(result.isFailure()).toBe(true)
      expect(result.success).toBe(false)
      expect(result.error).toBe(PingError.HostnameNotFound)
      expect(result.host).toBe('google.com')
      expect(result.packetLossPercentage).toBe(100)
      expect(result.numberOfPacketsTransmitted).toBeNull()
      expect(result.numberOfPacketsReceived).toBeNull()
      expect(result.lines).toEqual([])
    })

    it('should create a successful result when returnCode is zero', () => {
      const options: PingResultOptions = {
        output: [
          'PING google.com (142.250.185.110): 56 data bytes',
          '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
          '64 bytes from 142.250.185.110: icmp_seq=1 ttl=115 time=12.3 ms',
          '',
          '--- google.com ping statistics ---',
          '2 packets transmitted, 2 received, 0% packet loss',
          'round-trip min/avg/max/stddev = 10.5/11.4/12.3/0.9 ms'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)

      expect(result.isSuccess()).toBe(true)
      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(result.host).toBe('google.com')
      expect(result.packetLossPercentage).toBe(0)
      expect(result.numberOfPacketsTransmitted).toBe(2)
      expect(result.numberOfPacketsReceived).toBe(2)
      expect(result.minimumTimeInMs).toBe(10.5)
      expect(result.averageTimeInMs).toBe(11.4)
      expect(result.maximumTimeInMs).toBe(12.3)
      expect(result.standardDeviationTimeInMs).toBe(0.9)
      expect(result.lines).toHaveLength(2)
    })

    it('should handle partial packet loss', () => {
      const options: PingResultOptions = {
        output: [
          'PING google.com (142.250.185.110): 56 data bytes',
          '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
          '',
          '--- google.com ping statistics ---',
          '3 packets transmitted, 1 received, 66% packet loss'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)

      expect(result.isSuccess()).toBe(true)
      expect(result.success).toBe(true)
      expect(result.numberOfPacketsTransmitted).toBe(3)
      expect(result.numberOfPacketsReceived).toBe(1)
      expect(result.packetLossPercentage).toBe(67) // Rounded
    })

    it('should handle 100% packet loss as failure', () => {
      const options: PingResultOptions = {
        output: [
          'PING google.com (142.250.185.110): 56 data bytes',
          '',
          '--- google.com ping statistics ---',
          '3 packets transmitted, 0 received, 100% packet loss'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)

      expect(result.isFailure()).toBe(true)
      expect(result.success).toBe(false)
      expect(result.packetLossPercentage).toBe(100)
    })
  })

  describe('determineErrorFromOutput', () => {
    it('should detect hostname not found errors', () => {
      expect(PingResult.determineErrorFromOutput('ping: unknown host example.com'))
        .toBe(PingError.HostnameNotFound)
      
      expect(PingResult.determineErrorFromOutput('ping: name or service not known'))
        .toBe(PingError.HostnameNotFound)
    })

    it('should detect host unreachable errors', () => {
      expect(PingResult.determineErrorFromOutput('ping: no route to host'))
        .toBe(PingError.HostUnreachable)
      
      expect(PingResult.determineErrorFromOutput('ping: host unreachable'))
        .toBe(PingError.HostUnreachable)
    })

    it('should detect permission denied errors', () => {
      expect(PingResult.determineErrorFromOutput('ping: permission denied'))
        .toBe(PingError.PermissionDenied)
    })

    it('should detect timeout errors', () => {
      expect(PingResult.determineErrorFromOutput('ping: timeout'))
        .toBe(PingError.Timeout)
      
      expect(PingResult.determineErrorFromOutput('ping: timed out'))
        .toBe(PingError.Timeout)
    })

    it('should return unknown error for unrecognized output', () => {
      expect(PingResult.determineErrorFromOutput('some other error'))
        .toBe(PingError.UnknownError)
      
      expect(PingResult.determineErrorFromOutput(''))
        .toBe(PingError.UnknownError)
    })

    it('should be case insensitive', () => {
      expect(PingResult.determineErrorFromOutput('PING: UNKNOWN HOST example.com'))
        .toBe(PingError.HostnameNotFound)
      
      expect(PingResult.determineErrorFromOutput('PING: TIMEOUT'))
        .toBe(PingError.Timeout)
    })
  })

  describe('parsePingLines', () => {
    it('should parse valid ping response lines', () => {
      const output = [
        'PING google.com (142.250.185.110): 56 data bytes',
        '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
        '64 bytes from 142.250.185.110: icmp_seq=1 ttl=115 time=12.3 ms',
        '',
        '--- google.com ping statistics ---',
        '2 packets transmitted, 2 received, 0% packet loss'
      ]

      const lines = PingResult.parsePingLines(output)

      expect(lines).toHaveLength(2)
      expect(lines[0]!.getTimeInMs()).toBe(10.5)
      expect(lines[1]!.getTimeInMs()).toBe(12.3)
    })

    it('should filter out non-ping response lines', () => {
      const output = [
        'PING google.com (142.250.185.110): 56 data bytes',
        '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
        'some other line without time',
        '',
        '--- google.com ping statistics ---'
      ]

      const lines = PingResult.parsePingLines(output)

      expect(lines).toHaveLength(1)
      expect(lines[0]!.getTimeInMs()).toBe(10.5)
    })
  })

  describe('isPingResponseLine', () => {
    it('should return true for valid ping response lines', () => {
      expect(PingResult.isPingResponseLine('64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms'))
        .toBe(true)
      
      expect(PingResult.isPingResponseLine('64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time<=0.1 ms'))
        .toBe(true)
    })

    it('should return false for non-ping response lines', () => {
      expect(PingResult.isPingResponseLine('PING google.com (142.250.185.110): 56 data bytes'))
        .toBe(false)
      
      expect(PingResult.isPingResponseLine('--- google.com ping statistics ---'))
        .toBe(false)
      
      expect(PingResult.isPingResponseLine(''))
        .toBe(false)
    })
  })

  describe('calculatePacketLossPercentage', () => {
    it('should calculate packet loss percentage correctly', () => {
      expect(PingResult.calculatePacketLossPercentage(10, 10)).toBe(0)
      expect(PingResult.calculatePacketLossPercentage(10, 5)).toBe(50)
      expect(PingResult.calculatePacketLossPercentage(3, 1)).toBe(67) // Rounded
      expect(PingResult.calculatePacketLossPercentage(10, 0)).toBe(100)
    })

    it('should return 100% when no packets transmitted', () => {
      expect(PingResult.calculatePacketLossPercentage(0, 0)).toBe(100)
      expect(PingResult.calculatePacketLossPercentage(0, 5)).toBe(100)
    })
  })

  describe('averageResponseTimeInMs', () => {
    it('should return parsed average time when available', () => {
      const options: PingResultOptions = {
        output: [
          'round-trip min/avg/max/stddev = 10.5/11.4/12.3/0.9 ms'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)
      expect(result.averageResponseTimeInMs()).toBe(11.4)
    })

    it('should calculate average from lines when parsed average not available', () => {
      const options: PingResultOptions = {
        output: [
          '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.0 ms',
          '64 bytes from 142.250.185.110: icmp_seq=1 ttl=115 time=20.0 ms'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)
      expect(result.averageResponseTimeInMs()).toBe(15.0)
    })

    it('should return 0 when no lines and no parsed average', () => {
      const options: PingResultOptions = {
        output: [],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)
      expect(result.averageResponseTimeInMs()).toBe(0)
    })
  })

  describe('toArray', () => {
    it('should return correct array representation', () => {
      const options: PingResultOptions = {
        output: [
          '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
          '2 packets transmitted, 2 received, 0% packet loss',
          'round-trip min/avg/max/stddev = 10.5/11.4/12.3/0.9 ms'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)
      const array = result.toArray()

      expect(array.success).toBe(true)
      expect(array.error).toBeNull()
      expect(array.host).toBe('google.com')
      expect(array.packet_loss_percentage).toBe(0)
      expect(array.packets_transmitted).toBe(2)
      expect(array.packets_received).toBe(2)
      expect(array.options.timeout_in_seconds).toBe(5)
      expect(array.options.interval).toBe(1)
      expect(array.options.packet_size_in_bytes).toBe(56)
      expect(array.options.ttl).toBe(64)
      expect(array.timings.minimum_time_in_ms).toBe(10.5)
      expect(array.timings.average_time_in_ms).toBe(11.4)
      expect(array.timings.maximum_time_in_ms).toBe(12.3)
      expect(array.timings.standard_deviation_time_in_ms).toBe(0.9)
      expect(array.lines).toHaveLength(1)
    })
  })

  describe('toString', () => {
    it('should return the raw output', () => {
      const output = ['line 1', 'line 2', 'line 3']
      const options: PingResultOptions = {
        output,
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)
      expect(result.toString()).toBe('line 1\nline 2\nline 3')
    })
  })

  describe('type guards', () => {
    it('should properly narrow types with isSuccess()', () => {
      const options: PingResultOptions = {
        output: [
          '64 bytes from 142.250.185.110: icmp_seq=0 ttl=115 time=10.5 ms',
          '1 packets transmitted, 1 received, 0% packet loss'
        ],
        returnCode: 0,
        host: 'google.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)

      if (result.isSuccess()) {
        // These should not have TypeScript errors due to type narrowing
        expect(result.success).toBe(true)
        expect(result.error).toBeNull()
        expect(typeof result.host).toBe('string')
        expect(typeof result.numberOfPacketsTransmitted).toBe('number')
        expect(typeof result.numberOfPacketsReceived).toBe('number')
      }
    })

    it('should properly narrow types with isFailure()', () => {
      const options: PingResultOptions = {
        output: ['ping: unknown host example.com'],
        returnCode: 1,
        host: 'example.com',
        timeout: 5,
        interval: 1,
        packetSize: 56,
        ttl: 64
      }

      const result = PingResult.fromPingOutput(options)

      if (result.isFailure()) {
        // These should not have TypeScript errors due to type narrowing
        expect(result.success).toBe(false)
        expect(typeof result.error).toBe('string')
        expect(result.packetLossPercentage).toBe(100)
        expect(result.minimumTimeInMs).toBeNull()
        expect(result.maximumTimeInMs).toBeNull()
        expect(result.averageTimeInMs).toBeNull()
        expect(result.standardDeviationTimeInMs).toBeNull()
      }
    })
  })
})
