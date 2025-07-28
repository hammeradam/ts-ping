import type { SpawnSyncReturns } from 'node:child_process'
import { spawn, spawnSync } from 'node:child_process'
import os from 'node:os'
import { PingResult } from './ping-result.ts'

export class Ping {
  public readonly hostname: string
  public timeoutInSeconds: number
  public count: number
  public intervalInSeconds: number
  public packetSizeInBytes: number
  public ttl: number
  public showLostPackets: boolean
  private currentCommand: string[]

  constructor(
    hostname: string,
    timeoutInSeconds: number = 5,
    count: number = 1,
    intervalInSeconds: number = 1.0,
    packetSizeInBytes: number = 56,
    ttl: number = 64,
    showLostPackets: boolean = true,
  ) {
    this.hostname = hostname
    this.timeoutInSeconds = timeoutInSeconds
    this.count = count
    this.intervalInSeconds = intervalInSeconds
    this.packetSizeInBytes = packetSizeInBytes
    this.ttl = ttl
    this.showLostPackets = showLostPackets
    this.currentCommand = []
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
    })
  }

  async runAsync(): Promise<PingResult> {
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

      let stdout = ''
      let stderr = ''

      const child = spawn(command, commandArray.slice(1))

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Ping command timed out after ${timeout}ms`))
      }, timeout)

      child.stdout.on('data', (data) => {
        stdout += data.toString('utf-8')
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString('utf-8')
      })

      child.on('close', (code, signal) => {
        clearTimeout(timeoutId)

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

  setShowLostPackets(show: boolean = true): Ping {
    this.showLostPackets = show
    return this
  }

  buildPingCommand(): string[] {
    return this.startWithPingCommand()
      .addPacketCountOption()
      .addTimeoutOption()
      .addOptionalIntervalOption()
      .addOptionalPacketSizeOption()
      .addOptionalTtlOption()
      .addOptionalShowLostPacketsOption()
      .addTargetHostname()
      .getCommand()
  }

  startWithPingCommand(): Ping {
    this.currentCommand = ['ping']
    return this
  }

  getCommand(): string[] {
    return this.currentCommand
  }

  addPacketCountOption(): Ping {
    this.currentCommand.push('-c', String(this.count))
    return this
  }

  addTimeoutOption(): Ping {
    this.currentCommand.push('-W')
    if (this.isRunningOnMacOS()) {
      this.currentCommand.push(String(this.convertTimeoutToMilliseconds()))
    }
    else {
      this.currentCommand.push(String(this.timeoutInSeconds))
    }
    return this
  }

  addOptionalIntervalOption(): Ping {
    if (this.intervalInSeconds !== 1.0) {
      this.currentCommand.push('-i', String(this.intervalInSeconds))
    }
    return this
  }

  addOptionalPacketSizeOption(): Ping {
    if (this.packetSizeInBytes !== 56) {
      this.currentCommand.push('-s', String(this.packetSizeInBytes))
    }
    return this
  }

  addOptionalTtlOption(): Ping {
    if (this.ttl !== 64) {
      this.currentCommand.push('-t', String(this.ttl))
    }
    return this
  }

  addOptionalShowLostPacketsOption(): Ping {
    if (this.showLostPackets && !this.isRunningOnMacOS()) {
      this.currentCommand.push('-O')
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

  convertTimeoutToMilliseconds(): number {
    return this.timeoutInSeconds * 1000
  }
}
