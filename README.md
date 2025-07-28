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
- 🌊 **Streaming Support**: Real-time ping monitoring with async generators and advanced utilities
- 📈 **Live Statistics**: Rolling statistics calculation with jitter, packet loss, and performance metrics
- 🔄 **Memory Efficient**: Generator-based streaming that doesn't load all results into memory
- 🧪 **Well-Tested**: 90%+ test coverage with comprehensive test suite
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

## Streaming Support

The library provides powerful async generator-based streaming for real-time ping monitoring:

```typescript
import { Ping, PingStream } from 'ts-ping'

// Basic streaming - continuous ping monitoring
const ping = new Ping('google.com').setInterval(0.5) // Ping every 500ms
for await (const result of ping.stream()) {
  console.log(`${result.host}: ${result.isSuccess() ? result.averageResponseTimeInMs() + 'ms' : 'failed'}`)
  
  // Break after 10 results or run indefinitely
  if (someCondition) break
}
```

### Stream Processing with PingStream

```typescript
import { PingStream } from 'ts-ping'

const ping = new Ping('example.com').setInterval(0.5)
const stream = new PingStream(ping)

// Get rolling statistics every 10 pings
for await (const stats of stream.rollingStats(10)) {
  console.log(`Avg: ${stats.average.toFixed(1)}ms`)
  console.log(`Jitter: ${stats.jitter.toFixed(1)}ms`)
  console.log(`Packet Loss: ${stats.packetLoss.toFixed(1)}%`)
  console.log(`Std Dev: ${stats.standardDeviation.toFixed(1)}ms`)
}
```

### Advanced Streaming Examples

```typescript
// Take only the first 5 successful pings
for await (const result of stream.skipFailures().take(5)) {
  console.log(`Success: ${result.averageResponseTimeInMs()}ms`)
}

// Monitor only failures for alerting
for await (const failure of stream.skipSuccesses()) {
  console.error(`Ping failed: ${failure.error}`)
  await sendAlert(failure)
}

// Process in sliding windows of 3 results
for await (const window of stream.window(3)) {
  const avgLatency = window
    .filter(r => r.isSuccess())
    .map(r => r.averageResponseTimeInMs())
    .reduce((a, b) => a + b, 0) / window.length
  console.log(`Window average: ${avgLatency}ms`)
}

// Batch results with timeout
for await (const batch of stream.batchWithTimeout(5, 2000)) {
  console.log(`Processed batch of ${batch.length} results`)
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

#### stream()

Creates an async generator that yields ping results continuously:

```typescript
// Infinite stream (count = 0)
const ping = new Ping('google.com').setCount(Infinity).setInterval(1)
for await (const result of ping.stream()) {
  console.log(result.isSuccess() ? 'Success' : 'Failed')
  if (shouldStop) break
}

// Finite stream
const ping = new Ping('google.com').setCount(5).setInterval(0.5)
for await (const result of ping.stream()) {
  console.log(`Result ${result.host}: ${result.isSuccess()}`)
}
```

#### streamWithFilter()

Creates a filtered and optionally transformed stream:

```typescript
// Filter successful pings and get latencies
const latencies = ping.streamWithFilter(
  result => result.isSuccess(),
  result => result.averageResponseTimeInMs()
)

for await (const latency of latencies) {
  console.log(`Latency: ${latency}ms`)
}

// Filter failures and get error messages
const errors = ping.streamWithFilter(
  result => result.isFailure(),
  result => result.error
)

for await (const error of errors) {
  console.error(`Error: ${error}`)
}
```

#### streamBatched()

Creates a stream that yields arrays of results in batches:

```typescript
const ping = new Ping('google.com').setCount(10).setInterval(0.2)
for await (const batch of ping.streamBatched(3)) {
  console.log(`Batch of ${batch.length} results:`)
  batch.forEach(result => {
    console.log(`  ${result.host}: ${result.isSuccess()}`)
  })
}
```

### PingStream

Advanced streaming utilities for processing ping results:

```typescript
import { PingStream } from 'ts-ping'

const ping = new Ping('example.com').setInterval(0.5)
const stream = new PingStream(ping)
```

#### take(n)

Limits the stream to the first N results:

```typescript
// Get exactly 10 results
for await (const result of stream.take(10)) {
  console.log(result.isSuccess())
}
```

#### skipFailures() / skipSuccesses()

Filter results by success status:

```typescript
// Only successful pings
for await (const success of stream.skipFailures()) {
  console.log(`Success: ${success.averageResponseTimeInMs()}ms`)
}

// Only failed pings
for await (const failure of stream.skipSuccesses()) {
  console.error(`Failed: ${failure.error}`)
}
```

#### window(size)

Creates a sliding window of results:

```typescript
// Process results in windows of 5
for await (const window of stream.window(5)) {
  const successRate = window.filter(r => r.isSuccess()).length / window.length
  console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`)
}
```

#### rollingStats(windowSize)

Calculates rolling statistics over a window of results:

```typescript
for await (const stats of stream.rollingStats(20)) {
  console.log(`Average: ${stats.average.toFixed(1)}ms`)
  console.log(`Jitter: ${stats.jitter.toFixed(1)}ms`)
  console.log(`Packet Loss: ${stats.packetLoss.toFixed(1)}%`)
  console.log(`Std Dev: ${stats.standardDeviation.toFixed(1)}ms`)
  console.log(`Min/Max: ${stats.minimum}ms/${stats.maximum}ms`)
  console.log(`Count: ${stats.count}`)
  console.log(`Timestamp: ${stats.timestamp}`)
}
```

#### filter(predicate) / map(transform)

Standard functional programming operations:

```typescript
// Filter and transform
const highLatencies = stream
  .filter(result => result.isSuccess() && result.averageResponseTimeInMs() > 100)
  .map(result => ({
    host: result.host,
    latency: result.averageResponseTimeInMs(),
    timestamp: new Date()
  }))

for await (const data of highLatencies) {
  console.log(`High latency detected: ${data.latency}ms`)
}
```

#### batchWithTimeout(batchSize, timeoutMs)

Batches results by size or timeout:

```typescript
// Batch up to 5 results or every 2 seconds
for await (const batch of stream.batchWithTimeout(5, 2000)) {
  console.log(`Processing batch of ${batch.length} results`)
  const avgLatency = batch
    .filter(r => r.isSuccess())
    .map(r => r.averageResponseTimeInMs())
    .reduce((sum, lat) => sum + lat, 0) / batch.length
  console.log(`Batch average: ${avgLatency}ms`)
}
```

### PingStats Interface

Rolling statistics provided by `rollingStats()`:

```typescript
interface PingStats {
  count: number              // Number of successful pings
  average: number           // Average response time in ms
  minimum: number           // Minimum response time in ms
  maximum: number           // Maximum response time in ms
  standardDeviation: number // Standard deviation of response times
  jitter: number           // Network jitter (variance in response times)
  packetLoss: number       // Packet loss percentage (0-100)
  timestamp: Date          // When the stats were calculated
}
```

### combineAsyncIterators()

Utility function to merge multiple async iterators:

```typescript
import { combineAsyncIterators } from 'ts-ping'

const stream1 = new Ping('google.com').stream()
const stream2 = new Ping('github.com').stream()

const combined = combineAsyncIterators(stream1, stream2)
for await (const result of combined) {
  console.log(`${result.host}: ${result.isSuccess()}`)
}
```

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

### Real-time Network Monitoring

```typescript
import { Ping, PingStream } from 'ts-ping'

async function networkMonitor() {
  const ping = new Ping('google.com').setInterval(0.5) // Ping every 500ms
  const stream = new PingStream(ping)

  // Monitor with rolling statistics
  for await (const stats of stream.rollingStats(10)) {
    console.clear()
    console.log('Network Monitor - Last 10 pings:')
    console.log(`Average Latency: ${stats.average.toFixed(1)}ms`)
    console.log(`Jitter: ${stats.jitter.toFixed(1)}ms`)
    console.log(`Packet Loss: ${stats.packetLoss.toFixed(1)}%`)
    console.log(`Min/Max: ${stats.minimum}ms/${stats.maximum}ms`)
    console.log(`Timestamp: ${stats.timestamp.toLocaleTimeString()}`)
    
    // Alert on high latency
    if (stats.average > 100) {
      console.log('⚠️  High latency detected!')
    }
    
    // Alert on packet loss
    if (stats.packetLoss > 5) {
      console.log('🚨 Packet loss detected!')
    }
  }
}

networkMonitor()
```

### Streaming with Filtering

```typescript
import { Ping, PingStream } from 'ts-ping'

async function monitorFailures() {
  const ping = new Ping('example.com').setInterval(1)
  const stream = new PingStream(ping)

  console.log('Monitoring for failures...')
  
  // Only process failures for alerting
  for await (const failure of stream.skipSuccesses().take(5)) {
    console.error(`❌ Ping failed: ${failure.error}`)
    console.error(`   Host: ${failure.host}`)
    console.error(`   Time: ${new Date().toISOString()}`)
    
    // Send alert (example)
    await sendSlackAlert(`Ping to ${failure.host} failed: ${failure.error}`)
  }
}

async function sendSlackAlert(message: string) {
  // Implementation would send to Slack/Discord/etc
  console.log(`🔔 Alert: ${message}`)
}

monitorFailures()
```

### Batched Processing

```typescript
import { Ping, PingStream } from 'ts-ping'

async function batchProcessor() {
  const ping = new Ping('github.com').setInterval(0.2)
  const stream = new PingStream(ping)

  // Process in batches of 5 or every 3 seconds
  for await (const batch of stream.batchWithTimeout(5, 3000)) {
    console.log(`\nProcessing batch of ${batch.length} results:`)
    
    const successful = batch.filter(r => r.isSuccess())
    const failed = batch.filter(r => r.isFailure())
    
    console.log(`✅ Successful: ${successful.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    
    if (successful.length > 0) {
      const avgLatency = successful
        .map(r => r.averageResponseTimeInMs())
        .reduce((sum, lat) => sum + lat, 0) / successful.length
      console.log(`📊 Average latency: ${avgLatency.toFixed(1)}ms`)
    }
    
    // Save to database, send metrics, etc.
    await saveToDatabase(batch)
  }
}

async function saveToDatabase(batch: any[]) {
  console.log(`💾 Saved ${batch.length} results to database`)
}

batchProcessor()
```

### Multi-host Monitoring

```typescript
import { Ping, PingStream, combineAsyncIterators } from 'ts-ping'

async function multiHostMonitor() {
  const hosts = ['google.com', 'github.com', 'stackoverflow.com']
  
  // Create streams for each host
  const streams = hosts.map(host => 
    new Ping(host).setInterval(1).stream()
  )
  
  // Combine all streams into one
  const combined = combineAsyncIterators(...streams)
  
  console.log('Monitoring multiple hosts...')
  
  for await (const result of combined) {
    const status = result.isSuccess() 
      ? `✅ ${result.averageResponseTimeInMs()}ms`
      : `❌ ${result.error}`
    
    console.log(`${result.host}: ${status}`)
    
    // Take only first 20 results total
    if (Math.random() > 0.9) break // Example break condition
  }
}

multiHostMonitor()
```

### Advanced Filtering and Transformation

```typescript
import { Ping, PingStream } from 'ts-ping'

async function advancedProcessing() {
  const ping = new Ping('example.com').setInterval(0.5)
  const stream = new PingStream(ping)

  // Chain multiple operations
  const processedStream = stream
    .filter(result => result.isSuccess()) // Only successful pings
    .map(result => ({
      host: result.host,
      latency: result.averageResponseTimeInMs(),
      timestamp: new Date(),
      quality: result.averageResponseTimeInMs() < 50 ? 'excellent' : 
               result.averageResponseTimeInMs() < 100 ? 'good' : 'poor'
    }))
    .take(10) // Only process first 10 successful pings

  for await (const data of processedStream) {
    console.log(`${data.host}: ${data.latency}ms (${data.quality})`)
  }
}

advancedProcessing()
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
import { FailedPingResult, Ping, PingResult, PingStream, SuccessfulPingResult } from 'ts-ping'

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

// Streaming types are also fully typed
async function typedStreaming() {
  const ping = new Ping('example.com')
  const stream = new PingStream(ping)

  // Async generators are properly typed
  const results: AsyncGenerator<PingResult> = stream.take(5)
  const stats: AsyncGenerator<PingStats> = stream.rollingStats(10)
  const latencies: AsyncGenerator<number> = stream
    .filter(r => r.isSuccess())
    .map(r => r.averageResponseTimeInMs())
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

- Node.js 20+
- pnpm 8+ (recommended) or npm/yarn
- TypeScript 5+
- macOS or Linux (ping command must be available)

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines and ensure all tests pass before submitting a pull request.

## Changelog

### v1.1.0 (2025-07-28)
- 🌊 **New Streaming Support**: Added async generator-based streaming for real-time ping monitoring
- 📈 **PingStream Utilities**: Advanced stream processing with filtering, mapping, windowing, and statistics
- 📊 **Rolling Statistics**: Live calculation of latency, jitter, packet loss, and performance metrics
- 🔄 **Memory Efficient**: Generator-based streaming that doesn't load all results into memory
- 🎯 **Type-Safe Streams**: Full TypeScript support for async generators and streaming operations
- 🧰 **Stream Utilities**: `combineAsyncIterators`, batching, filtering, and transformation utilities
- 📚 **Enhanced Documentation**: Comprehensive examples for streaming and real-time monitoring
- 🧪 **Improved Coverage**: Test coverage increased to 92%+ with extensive streaming tests

### v1.0.0 (2025-07-28)
- 🎉 Initial release with TypeScript support
- ✨ Discriminated union types for type-safe results
- 🔄 Fluent interface for configuration
- 🌍 Cross-platform support (macOS/Linux)
- ⚡ Async support with `runAsync()` method
- 🧪 Comprehensive test suite with 94%+ coverage
- 📚 Complete documentation with examples
- 🔒 Security policy and contribution guidelines
