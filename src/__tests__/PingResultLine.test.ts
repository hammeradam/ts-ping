import { describe, expect, it } from 'vitest'
import { PingResultLine } from '../ping-result'

describe('pingResultLine', () => {
  describe('constructor', () => {
    it('should create a PingResultLine with default values', () => {
      const line = new PingResultLine()

      expect(line.getRawLine()).toBe('')
      expect(line.getTimeInMs()).toBe(0.0)
    })

    it('should create a PingResultLine with provided values', () => {
      const rawLine = '64 bytes from google.com: icmp_seq=1 ttl=64 time=10.5 ms'
      const timeInMs = 10.5

      const line = new PingResultLine(rawLine, timeInMs)

      expect(line.getRawLine()).toBe(rawLine)
      expect(line.getTimeInMs()).toBe(timeInMs)
    })

    it('should trim whitespace from raw line', () => {
      const rawLine = '  64 bytes from google.com: icmp_seq=1 ttl=64 time=10.5 ms  '
      const expected = '64 bytes from google.com: icmp_seq=1 ttl=64 time=10.5 ms'

      const line = new PingResultLine(rawLine, 10.5)

      expect(line.getRawLine()).toBe(expected)
    })
  })

  describe('fromLine', () => {
    it('should parse time from ping response line with time=', () => {
      const line = '64 bytes from google.com: icmp_seq=1 ttl=64 time=10.5 ms'

      const result = PingResultLine.fromLine(line)

      expect(result.getRawLine()).toBe(line)
      expect(result.getTimeInMs()).toBe(10.5)
    })

    it('should parse time from ping response line with time<=', () => {
      const line = '64 bytes from google.com: icmp_seq=1 ttl=64 time<=0.1 ms'

      const result = PingResultLine.fromLine(line)

      expect(result.getRawLine()).toBe(line)
      expect(result.getTimeInMs()).toBe(0.1)
    })

    it('should parse time with different decimal places', () => {
      const line = '64 bytes from google.com: icmp_seq=1 ttl=64 time=123.456 ms'

      const result = PingResultLine.fromLine(line)

      expect(result.getTimeInMs()).toBe(123.456)
    })

    it('should return 0 time when no time pattern is found', () => {
      const line = 'PING google.com (142.250.185.110): 56 data bytes'

      const result = PingResultLine.fromLine(line)

      expect(result.getRawLine()).toBe(line)
      expect(result.getTimeInMs()).toBe(0.0)
    })

    it('should handle case insensitive time pattern', () => {
      const line = '64 bytes from google.com: icmp_seq=1 ttl=64 TIME=10.5 MS'

      const result = PingResultLine.fromLine(line)

      expect(result.getTimeInMs()).toBe(10.5)
    })
  })

  describe('toArray', () => {
    it('should return correct array representation', () => {
      const rawLine = '64 bytes from google.com: icmp_seq=1 ttl=64 time=10.5 ms'
      const timeInMs = 10.5
      const line = new PingResultLine(rawLine, timeInMs)

      const result = line.toArray()

      expect(result).toEqual({
        line: rawLine,
        time_in_ms: timeInMs,
      })
    })
  })

  describe('toString', () => {
    it('should return the raw line', () => {
      const rawLine = '64 bytes from google.com: icmp_seq=1 ttl=64 time=10.5 ms'
      const line = new PingResultLine(rawLine, 10.5)

      expect(line.toString()).toBe(rawLine)
    })
  })
})
