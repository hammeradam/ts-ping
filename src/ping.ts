import type { SpawnSyncReturns } from 'node:child_process'
import { spawn, spawnSync } from 'node:child_process'
import { isIPv6 } from 'node:net'
import os from 'node:os'
import { PingResult } from './ping-result.ts'

export class Ping {
  public readonly hostname: string
  public timeoutInSeconds: number
  public count: number
  public intervalInSeconds: number
  public packetSizeInBytes: number
  public ttl: number
  public ipVersion?: 4 | 6
  /**
   * Optional AbortSignal for external cancellation of ping operations.
   * When the signal is aborted, all ongoing and future ping operations will be cancelled.
   *
   * @example
   * ```typescript
   * const abortController = new AbortController()
   * const ping = new Ping('google.com').setAbortSignal(abortController.signal)
   *
   * // Cancel after 5 seconds
   * setTimeout(() => abortController.abort(), 5000)
   *
   * // Or use AbortSignal.timeout for simpler timeout-based cancellation
   * const ping2 = new Ping('google.com').setAbortSignal(AbortSignal.timeout(5000))
   * ```
   */
  public abortSignal?: AbortSignal
  private currentCommand: string[]

  constructor(
    hostname: string,
    timeoutInSeconds: number = 5,
    count: number = 1,
    intervalInSeconds: number = 1.0,
    packetSizeInBytes: number = 56,
    ttl: number = 64,
  ) {
    this.hostname = hostname
    this.timeoutInSeconds = timeoutInSeconds
    this.count = count
    this.intervalInSeconds = intervalInSeconds
    this.packetSizeInBytes = packetSizeInBytes
    this.ttl = ttl
    this.ipVersion = this.autoDetectIPVersion(hostname)
    this.currentCommand = []
  }

  /**
   * Auto-detects the IP version based on the hostname.
   * Only sets IP version for IPv6 addresses to ensure proper command selection on macOS.
   * IPv4 addresses and hostnames default to undefined (system default).
   */
  private autoDetectIPVersion(hostname: string): 4 | 6 | undefined {
    // Only auto-detect IPv6 addresses for macOS compatibility
    // IPv4 addresses and hostnames can use the default ping command
    if (isIPv6(hostname)) {
      return 6
    }
    return undefined
  }

  run(): PingResult {
    const command = this.buildPingCommand()
    const result = this.executePingCommand(command)
    const combinedOutput = this.combineOutputLines(result)

    return PingResult.fromPingOutput({
      output: combinedOutput,
      returnCode: result.status ?? 1,
      host: this.hostname,
      timeout: this.timeoutInSeconds,
      interval: this.intervalInSeconds,
      packetSize: this.packetSizeInBytes,
      ttl: this.ttl,
      ipVersion: this.ipVersion,
    })
  }

  async runAsync(): Promise<PingResult> {
    // Check if already aborted
    if (this.abortSignal?.aborted) {
      throw new Error('Operation was aborted')
    }

    const command = this.buildPingCommand()
    const result = await this.executePingCommandAsync(command)
    const combinedOutput = this.combineOutputLines(result)

    return PingResult.fromPingOutput({
      output: combinedOutput,
      returnCode: result.status ?? 1,
      host: this.hostname,
      timeout: this.timeoutInSeconds,
      interval: this.intervalInSeconds,
      packetSize: this.packetSizeInBytes,
      ttl: this.ttl,
      ipVersion: this.ipVersion,
    })
  }

  /**
   * Creates an async generator that yields ping results in real-time.
   * Useful for continuous monitoring and streaming ping data.
   *
   * @example
   * ```typescript
   * const ping = new Ping('google.com').setInterval(1).setCount(0) // infinite
   *
   * for await (const result of ping.stream()) {
   *   if (result.isSuccess()) {
   *     console.log(`${new Date().toISOString()}: ${result.averageTimeInMs()}ms`)
   *   } else {
   *     console.error(`Ping failed: ${result.error}`)
   *   }
   * }
   * ```
   */
  async* stream(): AsyncGenerator<PingResult, void, unknown> {
    let sequenceNumber = 0
    const isInfinite = this.count === 0 || this.count === Infinity

    while (true) {
      try {
        // Check if aborted before starting ping
        if (this.abortSignal?.aborted) {
          break
        }

        const result = await this.runSinglePing(sequenceNumber++)
        yield result

        // Stop if we've reached the count limit (unless infinite)
        if (!isInfinite && sequenceNumber >= this.count) {
          break
        }

        // Wait for the interval before next ping
        if (this.intervalInSeconds > 0) {
          await this.sleep(this.intervalInSeconds * 1000)
        }
      }
      catch (error) {
        // Check if error is due to abortion
        if (error instanceof Error && error.message === 'Operation was aborted') {
          break
        }

        // Yield error result instead of throwing
        yield PingResult.fromError(error as Error, this.hostname, {
          timeout: this.timeoutInSeconds,
          interval: this.intervalInSeconds,
          packetSize: this.packetSizeInBytes,
          ttl: this.ttl,
        })
      }
    }
  }

  /**
   * Creates an async generator that yields ping results with filtering and transformation.
   *
   * @param filter Optional filter function to include only specific results
   * @param transform Optional transformation function to modify yielded values
   *
   * @example
   * ```typescript
   * // Only yield successful pings with latency values
   * for await (const latency of ping.streamWithFilter(
   *   r => r.isSuccess(),
   *   r => r.averageTimeInMs()
   * )) {
   *   console.log(`Latency: ${latency}ms`)
   * }
   * ```
   */
  async* streamWithFilter<T = PingResult>(
    filter?: (result: PingResult) => boolean,
    transform?: (result: PingResult) => T,
  ): AsyncGenerator<T, void, unknown> {
    for await (const result of this.stream()) {
      if (!filter || filter(result)) {
        yield transform ? transform(result) : (result as unknown as T)
      }
    }
  }

  /**
   * Creates an async generator that yields batches of ping results.
   * Useful for processing results in chunks or implementing backpressure.
   *
   * @param bufferSize Number of results to collect before yielding a batch
   *
   * @example
   * ```typescript
   * for await (const batch of ping.streamBatched(5)) {
   *   console.log(`Processing batch of ${batch.length} results`)
   *   const avgLatency = batch
   *     .filter(r => r.isSuccess())
   *     .reduce((sum, r) => sum + r.averageTimeInMs(), 0) / batch.length
   *   console.log(`Average latency: ${avgLatency}ms`)
   * }
   * ```
   */
  async* streamBatched(bufferSize: number = 10): AsyncGenerator<PingResult[], void, unknown> {
    const buffer: PingResult[] = []

    for await (const result of this.stream()) {
      buffer.push(result)

      if (buffer.length >= bufferSize) {
        yield [...buffer]
        buffer.length = 0
      }
    }

    // Yield remaining results if any
    if (buffer.length > 0) {
      yield buffer
    }
  }

  /**
   * Runs a single ping operation with sequence number.
   * Used internally by the streaming methods.
   */
  private async runSinglePing(_sequenceNumber: number): Promise<PingResult> {
    // Create a temporary ping instance for single ping
    const singlePing = new Ping(
      this.hostname,
      this.timeoutInSeconds,
      1, // Always ping once
      this.intervalInSeconds,
      this.packetSizeInBytes,
      this.ttl,
    )

    // Copy IP version setting
    if (this.ipVersion) {
      singlePing.setIPVersion(this.ipVersion)
    }

    // Copy abort signal setting
    if (this.abortSignal) {
      singlePing.setAbortSignal(this.abortSignal)
    }

    return await singlePing.runAsync()
  }

  /**
   * Sleep utility for interval timing.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already aborted
      if (this.abortSignal?.aborted) {
        reject(new Error('Operation was aborted'))
        return
      }

      const timeoutId = setTimeout(resolve, ms)

      // Handle abort signal
      const abortListener = () => {
        clearTimeout(timeoutId)
        reject(new Error('Operation was aborted'))
      }

      if (this.abortSignal) {
        this.abortSignal.addEventListener('abort', abortListener, { once: true })
      }

      // Clean up listener when promise resolves
      setTimeout(() => {
        if (this.abortSignal) {
          this.abortSignal.removeEventListener('abort', abortListener)
        }
      }, ms)
    })
  }

  executePingCommand(commandArray: string[]): SpawnSyncReturns<string> {
    const timeout = this.calculateProcessTimeout() * 1000
    const command = commandArray[0]
    if (!command) {
      throw new Error('No command specified')
    }
    return spawnSync(command, commandArray.slice(1), {
      encoding: 'utf-8',
      timeout,
    })
  }

  executePingCommandAsync(commandArray: string[]): Promise<SpawnSyncReturns<string>> {
    return new Promise((resolve, reject) => {
      const timeout = this.calculateProcessTimeout() * 1000
      const command = commandArray[0]
      if (!command) {
        reject(new Error('No command specified'))
        return
      }

      // Check if already aborted
      if (this.abortSignal?.aborted) {
        reject(new Error('Operation was aborted'))
        return
      }

      let stdout = ''
      let stderr = ''

      const child = spawn(command, commandArray.slice(1))

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Ping command timed out after ${timeout}ms`))
      }, timeout)

      // Handle abort signal
      const abortListener = () => {
        child.kill('SIGTERM')
        clearTimeout(timeoutId)
        reject(new Error('Operation was aborted'))
      }

      if (this.abortSignal) {
        this.abortSignal.addEventListener('abort', abortListener)
      }

      child.stdout.on('data', (data) => {
        stdout += data.toString('utf-8')
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString('utf-8')
      })

      child.on('close', (code, signal) => {
        clearTimeout(timeoutId)
        if (this.abortSignal) {
          this.abortSignal.removeEventListener('abort', abortListener)
        }

        // Create a SpawnSyncReturns-like object
        const result: SpawnSyncReturns<string> = {
          pid: child.pid || 0,
          output: [null, stdout, stderr],
          stdout,
          stderr,
          status: code,
          signal,
          error: undefined,
        }

        resolve(result)
      })

      child.on('error', (error: Error) => {
        clearTimeout(timeoutId)
        if (this.abortSignal) {
          this.abortSignal.removeEventListener('abort', abortListener)
        }
        reject(error)
      })
    })
  }

  calculateProcessTimeout(): number {
    const totalPingTime = this.count * (this.timeoutInSeconds + this.intervalInSeconds)
    return Math.ceil(totalPingTime) + 5
  }

  combineOutputLines(result: SpawnSyncReturns<string>): string[] {
    const stdoutLines = result.stdout?.split('\n') || []
    const stderrLines = result.stderr?.split('\n') || []
    return [...stdoutLines, ...stderrLines].filter(Boolean)
  }

  setTimeout(timeout: number): Ping {
    this.timeoutInSeconds = timeout
    return this
  }

  setCount(count: number): Ping {
    this.count = count
    return this
  }

  setInterval(interval: number): Ping {
    this.intervalInSeconds = interval
    return this
  }

  setPacketSize(size: number): Ping {
    this.packetSizeInBytes = size
    return this
  }

  setTtl(ttl: number): Ping {
    this.ttl = ttl
    return this
  }

  setIPVersion(version: 4 | 6): Ping {
    this.ipVersion = version
    return this
  }

  setIPv4(): Ping {
    return this.setIPVersion(4)
  }

  setIPv6(): Ping {
    return this.setIPVersion(6)
  }

  /**
   * Sets an AbortSignal for external cancellation of ping operations.
   *
   * @param abortSignal The AbortSignal to use for cancellation
   * @returns This Ping instance for method chaining
   *
   * @example
   * ```typescript
   * const abortController = new AbortController()
   * const ping = new Ping('google.com').setAbortSignal(abortController.signal)
   *
   * // Cancel the operation
   * abortController.abort()
   *
   * // Or use timeout-based cancellation
   * const ping2 = new Ping('google.com').setAbortSignal(AbortSignal.timeout(5000))
   * ```
   */
  setAbortSignal(abortSignal: AbortSignal): Ping {
    this.abortSignal = abortSignal
    return this
  }

  buildPingCommand(): string[] {
    return this.startWithPingCommand()
      .addIPVersionOption()
      .addPacketCountOption()
      .addTimeoutOption()
      .addOptionalIntervalOption()
      .addOptionalPacketSizeOption()
      .addOptionalTtlOption()
      .addTargetHostname()
      .getCommand()
  }

  startWithPingCommand(): Ping {
    if (this.isRunningOnMacOS() && this.ipVersion === 6) {
      // macOS uses separate ping6 command for IPv6
      this.currentCommand = ['ping6']
    }
    else {
      this.currentCommand = ['ping']
    }
    return this
  }

  addIPVersionOption(): Ping {
    // Only add -4/-6 flags on Linux and Windows
    // macOS uses separate ping6 command which is handled in startWithPingCommand
    if (!this.isRunningOnMacOS() && this.ipVersion) {
      if (this.ipVersion === 4) {
        this.currentCommand.push('-4')
      }
      else if (this.ipVersion === 6) {
        this.currentCommand.push('-6')
      }
    }
    return this
  }

  getCommand(): string[] {
    return this.currentCommand
  }

  addPacketCountOption(): Ping {
    if (this.isRunningOnWindows()) {
      this.currentCommand.push('-n', String(this.count))
    }
    else {
      this.currentCommand.push('-c', String(this.count))
    }
    return this
  }

  addTimeoutOption(): Ping {
    if (this.isRunningOnWindows()) {
      this.currentCommand.push('-w', String(this.convertTimeoutToMilliseconds()))
    }
    else {
      this.currentCommand.push('-W')
      if (this.isRunningOnMacOS()) {
        this.currentCommand.push(String(this.convertTimeoutToMilliseconds()))
      }
      else {
        this.currentCommand.push(String(this.timeoutInSeconds))
      }
    }
    return this
  }

  addOptionalIntervalOption(): Ping {
    // Windows doesn't support custom intervals in the same way
    if (this.intervalInSeconds !== 1.0 && !this.isRunningOnWindows()) {
      this.currentCommand.push('-i', String(this.intervalInSeconds))
    }
    return this
  }

  addOptionalPacketSizeOption(): Ping {
    if (this.packetSizeInBytes !== 56) {
      if (this.isRunningOnWindows()) {
        this.currentCommand.push('-l', String(this.packetSizeInBytes))
      }
      else {
        this.currentCommand.push('-s', String(this.packetSizeInBytes))
      }
    }
    return this
  }

  addOptionalTtlOption(): Ping {
    if (this.ttl !== 64) {
      if (this.isRunningOnWindows()) {
        this.currentCommand.push('-i', String(this.ttl))
      }
      else {
        this.currentCommand.push('-t', String(this.ttl))
      }
    }
    return this
  }

  addTargetHostname(): Ping {
    this.currentCommand.push(this.hostname)
    return this
  }

  isRunningOnMacOS(): boolean {
    return os.platform() === 'darwin'
  }

  isRunningOnWindows(): boolean {
    return os.platform() === 'win32'
  }

  convertTimeoutToMilliseconds(): number {
    return this.timeoutInSeconds * 1000
  }
}
