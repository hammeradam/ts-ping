/**
 * Example demonstrating streaming capabilities of ts-ping
 * Run with: npx tsx examples/streaming.ts
 *
 * This file showcases:
 * - Basic streaming functionality
 * - Filtering and transformation
 * - Rolling statistics calculation
 * - Failure monitoring patterns
 * - Batch processing
 * - Sliding window analysis
 * - Multi-host monitoring
 * - Health check patterns
 */

import process from 'node:process'
import { PingStream } from '../src/ping-stream.ts'
import { Ping } from '../src/ping.ts'

console.log('ts-ping Streaming Examples')
console.log('===========================\n')

// Example 1: Basic Streaming
async function basicStreamingExample() {
  console.log('Example 1: Basic Streaming')
  console.log('--------------------------')

  const ping = new Ping('google.com')
    .setInterval(1)
    .setCount(5) // Limit to 5 pings for demo

  let count = 0
  for await (const result of ping.stream()) {
    count++
    const timestamp = new Date().toISOString()

    if (result.isSuccess()) {
      console.log(`[${timestamp}] Ping ${count}: ${result.averageResponseTimeInMs()}ms`)
    }
    else {
      console.log(`[${timestamp}] Ping ${count}: ${result.error}`)
    }
  }
  console.log()
}

// Example 2: Filtering and Transformation
async function filteringExample() {
  console.log('Example 2: Filtering and Transformation')
  console.log('---------------------------------------')

  const ping = new Ping('google.com')
    .setInterval(0.5)
    .setCount(8)

  let count = 0
  for await (const latency of ping.streamWithFilter(
    r => r.isSuccess(),
    r => r.averageResponseTimeInMs(),
  )) {
    count++
    console.log(`Ping ${count}: ${latency}ms`)
  }
  console.log()
}

// Example 3: Rolling Statistics
async function rollingStatsExample() {
  console.log('Example 3: Rolling Statistics')
  console.log('------------------------------')

  const ping = new Ping('google.com').setInterval(0.3).setCount(15)
  const stream = new PingStream(ping)

  let statsCount = 0
  for await (const stats of stream.rollingStats(10)) {
    statsCount++
    console.log(`Stats Window ${statsCount}:`)
    console.log(`  Average: ${stats.average}ms`)
    console.log(`  Min/Max: ${stats.minimum}ms / ${stats.maximum}ms`)
    console.log(`  Jitter: ${stats.jitter}ms`)
    console.log(`  Loss: ${stats.packetLoss}%`)
    console.log()

    if (statsCount >= 3)
      break
  }
}

// Example 4: Failure Monitoring
async function failureMonitoringExample() {
  console.log('Example 4: Failure Monitoring')
  console.log('Monitoring for ping failures...\n')

  // Test with a potentially unreliable host
  const ping = new Ping('192.168.999.999') // Invalid IP to demonstrate failures
    .setTimeout(1)
    .setCount(3)

  const stream = new PingStream(ping)

  console.log('Testing with invalid IP to demonstrate failure handling...')
  for await (const failure of stream.skipSuccesses()) {
    console.log(`Ping failed: ${failure.error}`)
    console.log(`   Host: ${failure.host}`)
    console.log(`   Time: ${new Date().toISOString()}`)
  }
  console.log()
}

// Example 5: Batch Processing
async function batchProcessingExample() {
  console.log('Example 5: Batch Processing')
  console.log('Processing ping results in batches...\n')

  const ping = new Ping('google.com')
    .setInterval(0.1)
    .setCount(12)

  let batchNumber = 0
  for await (const batch of ping.streamBatched(4)) {
    batchNumber++
    const successful = batch.filter(r => r.isSuccess()).length
    const avgLatency = batch
      .filter(r => r.isSuccess())
      .reduce((sum, r) => sum + r.averageResponseTimeInMs(), 0) / successful || 0

    console.log(`Batch ${batchNumber}: ${successful}/${batch.length} successful, avg: ${avgLatency.toFixed(1)}ms`)
  }
  console.log()
}

// Example 6: Sliding Window Analysis
async function slidingWindowExample() {
  console.log('Example 6: Sliding Window Analysis')
  console.log('Analyzing ping trends with sliding windows...\n')

  const ping = new Ping('google.com')
    .setInterval(0.3)
    .setCount(10)

  const stream = new PingStream(ping)
  let windowCount = 0

  for await (const window of stream.window(3)) {
    windowCount++
    const latencies = window
      .filter(r => r.isSuccess())
      .map(r => r.averageResponseTimeInMs())

    if (latencies.length >= 2) {
      const first = latencies[0]!
      const last = latencies[latencies.length - 1]!
      const trend = last - first
      const trendIcon = trend > 0 ? 'UP' : trend < 0 ? 'DOWN' : 'STABLE'

      console.log(`Window ${windowCount}: [${latencies.map(l => l.toFixed(1)).join(', ')}]ms ${trendIcon}`)
    }
  }
  console.log()
}

// Example 7: Multi-Host Monitoring (Simplified)
async function multiHostExample() {
  console.log('Example 7: Multi-Host Monitoring')
  console.log('Monitoring multiple hosts (sequential for demo)...\n')

  const hosts = ['google.com', 'github.com']

  for (const host of hosts) {
    console.log(`Testing ${host}:`)
    const ping = new Ping(host).setCount(2).setInterval(0.5)

    for await (const result of ping.stream()) {
      if (result.isSuccess()) {
        console.log(`  ${result.averageResponseTimeInMs()}ms`)
      }
      else {
        console.log(`  ${result.error}`)
      }
    }
  }
  console.log()
}

// Example 8: Health Check Pattern
async function healthCheckExample() {
  console.log('Example 8: Health Check Pattern')
  console.log('Waiting for service to become available...\n')

  async function waitForService(host: string, maxAttempts: number = 5): Promise<boolean> {
    const ping = new Ping(host).setTimeout(2).setCount(maxAttempts).setInterval(1)

    for await (const result of ping.stream()) {
      if (result.isSuccess()) {
        console.log(`Service ${host} is healthy! (${result.averageResponseTimeInMs()}ms)`)
        return true
      }
      else {
        console.log(`Service ${host} not ready yet... (${result.error})`)
      }
    }

    console.log(`Service ${host} failed to become ready`)
    return false
  }

  await waitForService('google.com', 3)
  console.log()
}

// Run all examples
async function runAllExamples() {
  try {
    await basicStreamingExample()
    await filteringExample()
    await batchProcessingExample()
    await slidingWindowExample()
    await multiHostExample()
    await healthCheckExample()

    // Longer running examples
    await rollingStatsExample()
    await failureMonitoringExample()

    console.log('All streaming examples completed!')
  }
  catch (error) {
    console.error('Error running examples:', error)
  }
}

runAllExamples()
