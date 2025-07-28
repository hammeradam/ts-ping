# ts-ping

[![npm version](https://badge.fury.io/js/ts-ping.svg)](https://badge.fury.io/js/ts-ping)
[![CI](https://github.com/hammeradam/ts-ping/workflows/CI/badge.svg)](https://github.com/hammeradam/ts-ping/actions)
[![codecov](https://codecov.io/gh/hammeradam/ts-ping/branch/main/graph/badge.svg)](https://codecov.io/gh/hammeradam/ts-ping)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern TypeScript library for performing ICMP ping operations with type-safe results and fluent configuration.

## Features

- 🎯 **Type-Safe**: Built with TypeScript and discriminated union types for reliable type checking
- 🔧 **Fluent Interface**: Chainable methods for easy configuration
- 🌍 **Cross-Platform**: Works on macOS and Linux with platform-specific optimizations
- 📊 **Comprehensive Results**: Detailed ping statistics including packet loss, timing, and error information
- 🧪 **Well-Tested**: 94%+ test coverage with comprehensive test suite
- 🚀 **Modern**: Uses ES modules and modern JavaScript features

## Installation

```bash
# Using pnpm (recommended)
pnpm add ts-ping

# Using npm
npm install ts-ping

# Using yarn
yarn add ts-ping
```

## Quick Start

```typescript
import { Ping } from 'ts-ping'

const ping = new Ping('google.com').setCount(3).setTimeout(3)
const result = ping.run()

if (result.isSuccess()) {
  console.log(`Successfully pinged ${result.host}`)
  console.log(
    `Packets: ${result.numberOfPacketsTransmitted} sent, ${result.numberOfPacketsReceived} received`,
  )
  console.log(`Packet loss: ${result.packetLossPercentage}%`)
}
else if (result.isFailure()) {
  console.error(`Ping failed: ${result.error}`)
  console.error(`Host: ${result.host || 'unknown'}`)
}
```

## Async Support

The library supports both synchronous and asynchronous execution:

```typescript
import { Ping } from 'ts-ping'

// Synchronous (blocks until complete)
const result = new Ping('google.com').run()

// Asynchronous (returns a Promise)
const asyncResult = await new Ping('google.com').runAsync()

// Error handling with async
try {
  const result = await new Ping('example.com').runAsync()
  console.log('Ping completed:', result.isSuccess())
}
catch (error) {
  console.error('Ping failed with error:', error)
}
```

## API Reference

### Ping Class

#### Constructor

```typescript
new Ping(
  hostname: string,
  timeoutInSeconds?: number,
  count?: number,
  intervalInSeconds?: number,
  packetSizeInBytes?: number,
  ttl?: number,
  showLostPackets?: boolean
)
```

**Parameters:**
- `hostname` - The target hostname or IP address to ping
- `timeoutInSeconds` - Timeout for each ping in seconds (default: 5)
- `count` - Number of ping packets to send (default: 1)
- `intervalInSeconds` - Interval between pings in seconds (default: 1.0)
- `packetSizeInBytes` - Size of ping packets in bytes (default: 56)
- `ttl` - Time To Live value (default: 64)
- `showLostPackets` - Show lost packets in output (default: true, Linux only)

#### Fluent Interface Methods

All methods return `this` for method chaining:

```typescript
ping.setTimeout(10) // Set timeout in seconds
ping.setCount(5) // Set number of pings
ping.setInterval(2.0) // Set interval between pings
ping.setPacketSize(128) // Set packet size in bytes
ping.setTtl(32) // Set Time To Live
ping.setShowLostPackets(false) // Enable/disable lost packet reporting
```

#### Method Chaining Example

```typescript
const result = new Ping('example.com')
  .setTimeout(10)
  .setCount(5)
  .setInterval(1.5)
  .setPacketSize(128)
  .run()
```

#### run()

Executes the ping command synchronously and returns a `PingResult`.

```typescript
const result = ping.run()
```

#### runAsync()

Executes the ping command asynchronously and returns a `Promise<PingResult>`.

```typescript
const result = await ping.runAsync()

// With error handling
try {
  const result = await ping.runAsync()
  if (result.isSuccess()) {
    console.log('Ping successful!')
  }
}
catch (error) {
  console.error('Ping failed:', error)
}
```

**Benefits of async:**
- Non-blocking execution
- Better for multiple concurrent pings
- Integrates well with async/await patterns
- Proper timeout handling with Promise rejection

### PingResult

The result object uses discriminated unions for type safety. Use type guards to access specific properties:

#### Successful Results

```typescript
if (result.isSuccess()) {
  // TypeScript knows these properties are available and non-null
  console.log(result.host) // string
  console.log(result.numberOfPacketsTransmitted) // number
  console.log(result.numberOfPacketsReceived) // number
  console.log(result.packetLossPercentage) // number
  console.log(result.averageTimeInMs) // number | null
  console.log(result.minimumTimeInMs) // number | null
  console.log(result.maximumTimeInMs) // number | null
}
```

#### Failed Results

```typescript
if (result.isFailure()) {
  // TypeScript knows the error property is available
  console.log(result.error) // PingErrorType
  console.log(result.host) // string | null
  console.log(result.packetLossPercentage) // 100
}
```

#### Common Properties

Available on both success and failure results:

```typescript
result.rawOutput // string - full ping command output
result.lines // PingResultLine[] - parsed ping response lines
result.timeoutInSeconds // number | null
result.intervalInSeconds // number
result.packetSizeInBytes // number
result.ttl // number
```

### Error Types

```typescript
type PingErrorType
  = | 'HostnameNotFound'
    | 'HostUnreachable'
    | 'PermissionDenied'
    | 'Timeout'
    | 'UnknownError'
```

### PingResultLine

Individual ping response lines with parsed timing information:

```typescript
line.getRawLine() // string - original ping output line
line.getTimeInMs() // number - parsed response time in milliseconds
line.toArray() // { line: string, time_in_ms: number }
```

## Examples

### Basic Ping

```typescript
import { Ping } from 'ts-ping'

const result = new Ping('google.com').run()

if (result.isSuccess()) {
  console.log('Ping successful!')
}
else {
  console.log('Ping failed:', result.error)
}
```

### Async Ping

```typescript
import { Ping } from 'ts-ping'

async function pingExample() {
  try {
    const result = await new Ping('google.com').runAsync()

    if (result.isSuccess()) {
      console.log('Async ping successful!')
      console.log(`Average time: ${result.averageResponseTimeInMs()}ms`)
    }
    else {
      console.log('Async ping failed:', result.error)
    }
  }
  catch (error) {
    console.error('Ping threw an error:', error)
  }
}

pingExample()
```

### Multiple Concurrent Pings

```typescript
import { Ping } from 'ts-ping'

async function pingMultipleHosts() {
  const hosts = ['google.com', 'github.com', 'stackoverflow.com']

  const promises = hosts.map(host =>
    new Ping(host).setTimeout(5).runAsync()
  )

  try {
    const results = await Promise.all(promises)

    results.forEach((result, index) => {
      const host = hosts[index]
      if (result.isSuccess()) {
        console.log(`${host}: ${result.averageResponseTimeInMs()}ms`)
      }
      else {
        console.log(`${host}: ${result.error}`)
      }
    })
  }
  catch (error) {
    console.error('One or more pings failed:', error)
  }
}

pingMultipleHosts()
```

### Advanced Configuration

```typescript
import { Ping } from 'ts-ping'

const ping = new Ping('example.com')
  .setTimeout(10) // 10 second timeout
  .setCount(5) // Send 5 pings
  .setInterval(2.0) // 2 second interval
  .setPacketSize(128) // 128 byte packets
  .setTtl(32) // TTL of 32
  .setShowLostPackets(true) // Show lost packets (Linux only)

const result = ping.run()

if (result.isSuccess()) {
  console.log(`Host: ${result.host}`)
  console.log(`Packets sent: ${result.numberOfPacketsTransmitted}`)
  console.log(`Packets received: ${result.numberOfPacketsReceived}`)
  console.log(`Packet loss: ${result.packetLossPercentage}%`)

  if (result.averageTimeInMs) {
    console.log(`Average time: ${result.averageTimeInMs}ms`)
  }

  if (result.minimumTimeInMs && result.maximumTimeInMs) {
    console.log(`Time range: ${result.minimumTimeInMs}ms - ${result.maximumTimeInMs}ms`)
  }
}
else {
  console.error(`Ping failed with error: ${result.error}`)
}
```

### Processing Individual Lines

```typescript
import { Ping } from 'ts-ping'

const result = new Ping('google.com').setCount(3).run()

if (result.isSuccess()) {
  console.log('Individual ping times:')
  result.lines.forEach((line, index) => {
    console.log(`${index + 1}: ${line.getTimeInMs()}ms`)
  })
}
```

### Error Handling

```typescript
import { Ping, PingError } from 'ts-ping'

const result = new Ping('nonexistent.example.com').run()

if (result.isFailure()) {
  switch (result.error) {
    case PingError.HostnameNotFound:
      console.error('Hostname could not be resolved')
      break
    case PingError.HostUnreachable:
      console.error('Host is unreachable')
      break
    case PingError.PermissionDenied:
      console.error('Permission denied - try running as administrator')
      break
    case PingError.Timeout:
      console.error('Ping timed out')
      break
    default:
      console.error('Unknown error occurred')
  }
}
```

## Platform Support

### macOS
- Uses milliseconds for timeout values (`-W 5000`)
- Does not support the `-O` (show lost packets) option

### Linux
- Uses seconds for timeout values (`-W 5`)
- Supports the `-O` option for showing lost packets

The library automatically detects the platform and adjusts command parameters accordingly.

## TypeScript Integration

This library is built with TypeScript and provides excellent type safety:

```typescript
import { FailedPingResult, Ping, PingResult, SuccessfulPingResult } from 'ts-ping'

function handlePingResult(result: PingResult) {
  if (result.isSuccess()) {
    // result is automatically narrowed to SuccessfulPingResult
    const host: string = result.host // ✅ string
    const transmitted: number = result.numberOfPacketsTransmitted // ✅ number
  }
  else {
    // result is automatically narrowed to FailedPingResult
    const error: PingErrorType = result.error // ✅ PingErrorType
    const loss: 100 = result.packetLossPercentage // ✅ exactly 100
  }
}
```

## Development

### Building

```bash
pnpm run build
```

### Testing

```bash
pnpm test                # Run all tests
pnpm run test:watch      # Run tests in watch mode
pnpm run test:coverage   # Run tests with coverage
```

### Linting

```bash
pnpm run lint            # Check for linting issues
pnpm run lint:fix        # Fix linting issues automatically
```

## Requirements

- Node.js 18+
- pnpm 8+ (recommended) or npm/yarn
- TypeScript 5+
- macOS or Linux (ping command must be available)

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and ensure all tests pass before submitting a pull request.

## Changelog

### v1.0.0 (2025-07-28)
- 🎉 Initial release with TypeScript support
- ✨ Discriminated union types for type-safe results
- 🔄 Fluent interface for configuration
- 🌍 Cross-platform support (macOS/Linux)
- ⚡ Async support with `runAsync()` method
- 🧪 Comprehensive test suite with 94%+ coverage
- 📚 Complete documentation with examples
- 🔒 Security policy and contribution guidelines
