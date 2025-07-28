import { describe, expect, it } from 'vitest'
import { PingError, PingErrorUtils } from '../ping-result'

describe('pingError', () => {
  it('should have all expected error constants', () => {
    expect(PingError.HostnameNotFound).toBe('HostnameNotFound')
    expect(PingError.HostUnreachable).toBe('HostUnreachable')
    expect(PingError.PermissionDenied).toBe('PermissionDenied')
    expect(PingError.Timeout).toBe('Timeout')
    expect(PingError.UnknownError).toBe('UnknownError')
  })
})

describe('pingErrorUtils', () => {
  describe('from', () => {
    it('should return the same error if it is a valid PingErrorType', () => {
      expect(PingErrorUtils.from('HostnameNotFound')).toBe(PingError.HostnameNotFound)
      expect(PingErrorUtils.from('HostUnreachable')).toBe(PingError.HostUnreachable)
      expect(PingErrorUtils.from('PermissionDenied')).toBe(PingError.PermissionDenied)
      expect(PingErrorUtils.from('Timeout')).toBe(PingError.Timeout)
      expect(PingErrorUtils.from('UnknownError')).toBe(PingError.UnknownError)
    })

    it('should return UnknownError for invalid error strings', () => {
      expect(PingErrorUtils.from('InvalidError')).toBe(PingError.UnknownError)
      expect(PingErrorUtils.from('SomeOtherError')).toBe(PingError.UnknownError)
      expect(PingErrorUtils.from('')).toBe(PingError.UnknownError)
      expect(PingErrorUtils.from('undefined')).toBe(PingError.UnknownError)
    })

    it('should return UnknownError for case-sensitive mismatches', () => {
      expect(PingErrorUtils.from('hostnamenotfound')).toBe(PingError.UnknownError)
      expect(PingErrorUtils.from('TIMEOUT')).toBe(PingError.UnknownError)
      expect(PingErrorUtils.from('Hostname_Not_Found')).toBe(PingError.UnknownError)
    })
  })
})
