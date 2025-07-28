// Result types and classes
export {
  type FailedPingResult,
  PingResult,
  type PingResultArray,
  PingResultLine,
  type SuccessfulPingResult,
} from './ping-result.js'

// Error types and utilities
export {
  PingError,
  type PingErrorType,
  PingErrorUtils,
} from './ping-result.js'

// Streaming utilities
export {
  combineAsyncIterators,
  type PingStats,
  PingStream,
} from './ping-stream.js'

// Main library exports
export { Ping } from './ping.js'
