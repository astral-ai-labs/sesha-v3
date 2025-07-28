/* ==========================================================================*/
// pipeline-logger.ts — Winston-based Pipeline Logging System
/* ==========================================================================*/
// Purpose: Comprehensive logging for pipeline execution with structured output
// Sections: Imports, Configuration, Logger Class, Global Instance, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// Core Modules ---
import "server-only"
import fs from 'fs'

// External Packages ---
import winston from 'winston'
import path from 'path'

/* ==========================================================================*/
// Winston Configuration
/* ==========================================================================*/

interface PipelineLogData {
  step?: string
  stepNumber?: number
  stepName?: string
  pipelineMode?: 'digest' | 'aggregate' // Track pipeline mode
  type: 'request' | 'response' | 'prompt' | 'info' | 'error' | 'slug_cleaning' | 'pipeline_start' | 'pipeline_complete'
  message: string
  data?: unknown
  originalSlug?: string
  cleanedSlug?: string
  wasChanged?: boolean
  systemPrompt?: string
  userPrompt?: string
  assistantPrompt?: string
  systemPromptLength?: number
  userPromptLength?: number
  assistantPromptLength?: number
  request?: unknown
  response?: unknown
  result?: unknown
  success?: boolean
  finalResponse?: unknown
  error?: unknown
}

/* ==========================================================================*/
// Pipeline Logger Class
/* ==========================================================================*/

class PipelineLogger {
  private logger: winston.Logger
  private sessionId: string
  private logFilePath: string
  private pipelineMode: 'digest' | 'aggregate'

  constructor(sessionId?: string, pipelineMode: 'digest' | 'aggregate' = 'digest') {
    this.sessionId = sessionId || `pipeline-${Date.now()}`
    this.pipelineMode = pipelineMode
    
    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.logFilePath = path.join(process.cwd(), 'logs', `${pipelineMode}-pipeline-${timestamp}-${this.sessionId}.log`)
    
    // Determine if we're in a serverless/production environment where file system access is limited
    // TODO: PUT THIS BACK
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production'
    // const isServerless = false

    // Configure transports based on environment
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf((info) => {
            const { level, message, timestamp, step, type } = info;
            const mode = this.pipelineMode;
            return `${timestamp} [${level}] 📝 [${mode.toUpperCase()}:${step || 'MAIN'}] ${type?.toString().toUpperCase()}: ${message}`
          })
        )
      })
    ]

    // Only add file transport in development or when file system is available
    if (!isServerless) {
      try {
        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs')
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true })
        }
        
        transports.push(
          new winston.transports.File({ 
            filename: this.logFilePath,
            maxsize: 10 * 1024 * 1024, // 10MB max file size
            maxFiles: 5 // Keep 5 old log files
          })
        )
      } catch (error) {
        console.warn('Failed to create file transport for logging, using console only:', error)
      }
    }
    
    // Configure Winston logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.prettyPrint()
      ),
      transports
    })

    this.logger.info(`${pipelineMode.charAt(0).toUpperCase() + pipelineMode.slice(1)} Pipeline Logger initialized`, {
      sessionId: this.sessionId,
      pipelineMode: this.pipelineMode,
      logFilePath: isServerless ? 'console-only' : this.logFilePath,
      environment: isServerless ? 'serverless' : 'development',
      type: 'info',
      message: `${pipelineMode.charAt(0).toUpperCase() + pipelineMode.slice(1)} Pipeline Logger initialized`
    })
  }

  /**
   * Log initial pipeline request with all data
   */
  logInitialRequest(request: unknown) {
    const logData: PipelineLogData = {
      step: 'PIPELINE_START',
      pipelineMode: this.pipelineMode,
      type: 'pipeline_start',
      message: `Initial ${this.pipelineMode} pipeline request received with full data`,
      data: request, // Log complete request data
      request: request // Also include in request field for consistency
    }
    
    this.logger.info(`${this.pipelineMode.charAt(0).toUpperCase() + this.pipelineMode.slice(1)} pipeline started`, logData)
  }

  /**
   * Log slug cleaning process
   */
  logSlugCleaning(originalSlug: string, cleanedSlug: string) {
    const logData: PipelineLogData = {
      step: 'SLUG_CLEANING',
      pipelineMode: this.pipelineMode,
      type: 'slug_cleaning',
      message: 'Slug cleaning process',
      originalSlug,
      cleanedSlug,
      wasChanged: originalSlug !== cleanedSlug
    }
    
    this.logger.info('Slug cleaned', logData)
  }

  /**
   * Log formatted prompts for a step
   */
  logStepPrompts(stepNumber: number, stepName: string, systemPrompt: string, userPrompt: string, assistantPrompt?: string) {
    const logData: PipelineLogData = {
      step: `STEP_${stepNumber}_PROMPTS`,
      stepNumber,
      stepName,
      pipelineMode: this.pipelineMode,
      type: 'prompt',
      message: `Formatted prompts for ${stepName}`,
      systemPrompt,
      userPrompt,
      assistantPrompt,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      assistantPromptLength: assistantPrompt?.length
    }
    
    this.logger.info('Step prompts formatted', logData)
  }

  /**
   * Log step request being sent to API with all data
   */
  logStepRequest(stepNumber: number, stepName: string, request: unknown) {
    const logData: PipelineLogData = {
      step: `STEP_${stepNumber}_REQUEST`,
      stepNumber,
      stepName,
      pipelineMode: this.pipelineMode,
      type: 'request',
      message: `API request for ${stepName} with full data`,
      request, // Log complete request data
      data: request // Also include in data field for consistency
    }
    
    this.logger.info('Step request sent', logData)
  }

  /**
   * Log step response from API with all data
   */
  logStepResponse(stepNumber: number, stepName: string, response: unknown) {
    const logData: PipelineLogData = {
      step: `STEP_${stepNumber}_RESPONSE`,
      stepNumber,
      stepName,
      pipelineMode: this.pipelineMode,
      type: 'response',
      message: `API response for ${stepName} with full data`,
      response, // Log complete response data
      data: response // Also include in data field for consistency
    }
    
    this.logger.info('Step response received', logData)
  }

  /**
   * Log step completion with final result and all data
   */
  logStepComplete(stepNumber: number, stepName: string, result: unknown) {
    const logData: PipelineLogData = {
      step: `STEP_${stepNumber}_COMPLETE`,
      stepNumber,
      stepName,
      pipelineMode: this.pipelineMode,
      type: 'info',
      message: `Step completed: ${stepName} with full result data`,
      result, // Log complete result data
      data: result // Also include in data field for consistency
    }
    
    this.logger.info('Step completed', logData)
  }

  /**
   * Log pipeline completion with all final data
   */
  logPipelineComplete(success: boolean, finalResponse: unknown) {
    const logData: PipelineLogData = {
      step: 'PIPELINE_COMPLETE',
      pipelineMode: this.pipelineMode,
      type: 'pipeline_complete',
      message: `${this.pipelineMode.charAt(0).toUpperCase() + this.pipelineMode.slice(1)} pipeline execution completed`,
      success,
      finalResponse, // Log complete final response
      data: finalResponse // Also include in data field for consistency
    }
    
    this.logger.info(`${this.pipelineMode.charAt(0).toUpperCase() + this.pipelineMode.slice(1)} pipeline completed`, logData)
  }

  /**
   * Log errors with all available data
   */
  logError(step: string, error: unknown) {
    const logData: PipelineLogData = {
      step,
      pipelineMode: this.pipelineMode,
      type: 'error',
      message: `Error occurred in ${this.pipelineMode} pipeline`,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      data: error // Also include in data field for consistency
    }
    
    this.logger.error(`${this.pipelineMode.charAt(0).toUpperCase() + this.pipelineMode.slice(1)} pipeline error`, logData)
  }

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production'
    return isServerless ? 'console-only (serverless environment)' : this.logFilePath
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Close the logger and flush any pending writes
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', () => {
        resolve()
      })
      this.logger.end()
    })
  }
}

/* ==========================================================================*/
// Global Instance Management
/* ==========================================================================*/

let globalLogger: PipelineLogger | null = null

/**
 * Create a new pipeline logger instance
 * 
 * @param sessionId - Optional session identifier
 * @param pipelineMode - Optional pipeline mode ('digest' or 'aggregate')
 * @returns New PipelineLogger instance
 */
export function createPipelineLogger(sessionId?: string, pipelineMode: 'digest' | 'aggregate' = 'digest'): PipelineLogger {
  return new PipelineLogger(sessionId, pipelineMode)
}

/**
 * Initialize global pipeline logger
 * 
 * @param sessionId - Optional session identifier
 * @param pipelineMode - Optional pipeline mode ('digest' or 'aggregate')
 * @returns Global PipelineLogger instance
 */
export function initializeGlobalLogger(sessionId?: string, pipelineMode: 'digest' | 'aggregate' = 'digest'): PipelineLogger {
  globalLogger = new PipelineLogger(sessionId, pipelineMode)
  return globalLogger
}

/**
 * Get the global logger instance
 * 
 * @returns Global logger instance or null if not initialized
 */
export function getGlobalLogger(): PipelineLogger | null {
  return globalLogger
}

/**
 * Close and cleanup global logger
 */
export async function closeGlobalLogger(): Promise<void> {
  if (globalLogger) {
    await globalLogger.close()
    globalLogger = null
  }
}

/* ==========================================================================*/
// Public API Exports
/* ==========================================================================*/

export { PipelineLogger } 