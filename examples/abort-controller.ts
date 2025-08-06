/**
 * Example demonstrating AbortSignal functionality in ts-ping
 * Run with: npx tsx examples/abort-controller.ts
 *
 * This file showcases:
 * - Manual cancellation with AbortController
 * - Streaming ping with external cancellation
 * - Timeout-based cancellation with AbortSignal.timeout()
 * - Graceful shutdown handling
 * - Integration with async generators
 */

import { Ping } from '../src/ping.ts'

console.log('ts-ping AbortSignal Examples')
console.log('============================\n')

async function basicAbortExample() {
  console.log('=== Basic Abort Example ===')
  const abortController = new AbortController()
  const ping = new Ping('google.com')
    .setCount(5)
    .setInterval(1)
    .setAbortSignal(abortController.signal)

  // Abort after 3 seconds
  setTimeout(() => {
    console.log('Aborting ping operation...')
    abortController.abort()
  }, 3000)

  try {
    const result = await ping.runAsync()
    console.log('Ping completed:', result.isSuccess())
  }
  catch (error) {
    console.log('Ping aborted:', (error as Error).message)
  }
}

async function streamingAbortExample() {
  console.log('\n=== Streaming Abort Example ===')
  const abortController = new AbortController()
  const ping = new Ping('google.com')
    .setCount(0) // infinite
    .setInterval(1)
    .setAbortSignal(abortController.signal)

  // Abort after 5 seconds
  setTimeout(() => {
    console.log('Aborting streaming ping...')
    abortController.abort()
  }, 5000)

  let pingCount = 0
  try {
    for await (const result of ping.stream()) {
      pingCount++
      if (result.isSuccess()) {
        console.log(`Ping ${pingCount}: ${result.averageTimeInMs ?? 'N/A'}ms`)
      }
      else {
        console.log(`Ping ${pingCount}: Failed - ${result.error}`)
      }
    }
  }
  catch (error) {
    console.log('Stream ended due to error:', (error as Error).message)
  }

  console.log(`Total pings completed before abort: ${pingCount}`)
}

async function manualAbortExample() {
  console.log('\n=== Manual Abort Example ===')
  const abortController = new AbortController()
  const ping = new Ping('google.com')
    .setCount(0) // infinite
    .setInterval(0.5)
    .setAbortSignal(abortController.signal)

  let pingCount = 0
  const maxPings = 3

  try {
    for await (const result of ping.stream()) {
      pingCount++
      if (result.isSuccess()) {
        console.log(`Ping ${pingCount}: ${result.averageTimeInMs ?? 'N/A'}ms`)
      }
      else {
        console.log(`Ping ${pingCount}: Failed - ${result.error}`)
      }

      // Manually abort after a certain number of pings
      if (pingCount >= maxPings) {
        console.log(`Reached ${maxPings} pings, aborting...`)
        abortController.abort()
      }
    }
  }
  catch (error) {
    console.log('Stream ended:', (error as Error).message)
  }

  console.log(`Stream completed after ${pingCount} pings`)
}

async function timeoutAbortExample() {
  console.log('\n=== Timeout with AbortSignal.timeout() Example ===')
  // Using AbortSignal.timeout() - a cleaner way for time-based cancellation
  const ping = new Ping('google.com')
    .setCount(0) // infinite
    .setInterval(0.8)
    .setAbortSignal(AbortSignal.timeout(3000)) // Abort after 3 seconds

  let pingCount = 0
  try {
    for await (const result of ping.stream()) {
      pingCount++
      if (result.isSuccess()) {
        console.log(`Ping ${pingCount}: ${result.averageTimeInMs ?? 'N/A'}ms`)
      }
      else {
        console.log(`Ping ${pingCount}: Failed - ${result.error}`)
      }
    }
  }
  catch (error) {
    console.log('Stream ended due to timeout:', (error as Error).message)
  }

  console.log(`Total pings completed before timeout: ${pingCount}`)
}

// Run examples
async function runExamples() {
  await basicAbortExample()
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

  await streamingAbortExample()
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

  await manualAbortExample()
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second

  await timeoutAbortExample()
}

runExamples().catch(console.error)
