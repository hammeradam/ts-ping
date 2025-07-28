#!/usr/bin/env node

/**
 * Example demonstrating IPv4/IPv6 support in ts-ping
 * Run with: npx tsx examples/ipv4-ipv6-example.ts
 */

import { Ping } from '../src/index.js'

async function demonstrateIPVersions() {
  console.log('🌐 IPv4/IPv6 Support Demo\n')

  // Test IPv4 explicitly
  console.log('📡 Testing IPv4 ping...')
  const ping4 = new Ping('8.8.8.8').setIPv4().setCount(2)
  const result4 = ping4.run()

  if (result4.isSuccess()) {
    console.log(`✅ IPv${result4.ipVersion} ping successful`)
    console.log(`   Host: ${result4.host}`)
    console.log(`   Average time: ${result4.averageTimeInMs}ms`)
    console.log(`   Packet loss: ${result4.packetLossPercentage}%\n`)
  }
  else {
    console.log(`❌ IPv4 ping failed: ${result4.error}\n`)
  }

  // Test IPv6 explicitly (if available)
  console.log('📡 Testing IPv6 ping...')
  const ping6 = new Ping('2001:4860:4860::8888').setIPv6().setCount(2)
  const result6 = ping6.run()

  if (result6.isSuccess()) {
    console.log(`✅ IPv${result6.ipVersion} ping successful`)
    console.log(`   Host: ${result6.host}`)
    console.log(`   Average time: ${result6.averageTimeInMs}ms`)
    console.log(`   Packet loss: ${result6.packetLossPercentage}%\n`)
  }
  else {
    console.log(`❌ IPv6 ping failed: ${result6.error}`)
    console.log(`   (IPv6 may not be available on this network)\n`)
  }

  // Test dual-stack hostname (let the system choose)
  console.log('📡 Testing dual-stack hostname (system default)...')
  const pingDefault = new Ping('google.com').setCount(1)
  const resultDefault = pingDefault.run()

  if (resultDefault.isSuccess()) {
    console.log(`✅ Default ping successful`)
    console.log(`   Host: ${resultDefault.host}`)
    console.log(`   IP Version: ${resultDefault.ipVersion || 'system default'}`)
    console.log(`   Average time: ${resultDefault.averageTimeInMs}ms\n`)
  }
  else {
    console.log(`❌ Default ping failed: ${resultDefault.error}\n`)
  }

  // Test with method chaining
  console.log('📡 Testing with method chaining and IPv6...')
  const chainedResult = new Ping('google.com')
    .setIPv6()
    .setCount(3)
    .setTimeout(5)
    .run()

  if (chainedResult.isSuccess()) {
    console.log(`✅ Chained IPv${chainedResult.ipVersion} ping successful`)
    console.log(`   Packets sent: ${chainedResult.numberOfPacketsTransmitted}`)
    console.log(`   Packets received: ${chainedResult.numberOfPacketsReceived}`)
    console.log(`   Packet loss: ${chainedResult.packetLossPercentage}%`)
  }
  else {
    console.log(`❌ Chained IPv6 ping failed: ${chainedResult.error}`)
  }
}

// Async example with streaming
async function demonstrateIPv6Streaming() {
  console.log('\n🌊 IPv6 Streaming Demo')

  const ping = new Ping('google.com')
    .setIPv6()
    .setInterval(1)
    .setCount(3)

  let count = 0
  try {
    for await (const result of ping.stream()) {
      count++
      if (result.isSuccess()) {
        console.log(`Stream ${count}: IPv${result.ipVersion} - ${result.averageResponseTimeInMs()}ms`)
      }
      else {
        console.log(`Stream ${count}: IPv6 failed - ${result.error}`)
      }

      if (count >= 3)
        break
    }
  }
  catch (error) {
    console.error('Streaming error:', error)
  }
}

// Run the examples
console.log('Starting IPv4/IPv6 demonstration...\n')

demonstrateIPVersions()
  .then(() => demonstrateIPv6Streaming())
  .then(() => {
    console.log('\n✨ Demo completed!')
  })
  .catch((error) => {
    console.error('Demo error:', error)
  })
