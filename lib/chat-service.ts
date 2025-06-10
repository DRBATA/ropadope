/**
 * ChatService - Handles communication with the local LLM server
 * This class provides methods to interact with both the local TinyLlama model
 * and optionally fall back to OpenAI for more complex queries
 */

import { db } from './db';

export interface ChatCompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  episodeId?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Schema for structured LLM responses
export interface StructuredResponse {
  greeting?: string;
  response: string;
  extracted_symptoms?: {
    name: string;
    present: boolean;
    confidence: number;
    duration?: string;
    severity?: 'mild' | 'moderate' | 'severe';
  }[];
  follow_up?: string;
  metadata?: {
    age_group?: 'child' | 'adult' | 'senior';
    language?: string;
  };
}

export class ChatService {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://127.0.0.1:8080') {
    this.baseUrl = baseUrl;
  }

  /**
   * Send a message to the local LLM and get a completion
   */
  async sendMessage(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    try {
      // Add default stop sequences to prevent model from generating user prompts
      const defaultStops = ["User:", "\nUser", "\nuser", "Human:", "\nHuman"];
      const stopSequences = options.stop ? [...defaultStops, ...options.stop] : defaultStops;
      
      const response = await fetch(`${this.baseUrl}/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: this.formatPrompt(messages),
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 500,
          stop: stopSequences,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM server error: ${response.statusText}`);
      }

      // Handle different response formats from llama-server
      let result;
      let content;
      try {
        // Try to parse as JSON
        result = await response.json();
        content = result.content || result.response || result.text || result.generation || JSON.stringify(result);
      } catch (parseError) {
        // If JSON parsing fails, get response as text
        const textResponse = await response.text();
        content = textResponse;
        console.log('Received text response:', textResponse);
      }
      
      // Save to database if episodeId is provided
      if (options.episodeId) {
        await this.saveMessageToDb({
          episodeId: options.episodeId,
          role: 'assistant',
          content: content,
          timestamp: new Date()
        });
      }

      return content;
    } catch (error) {
      console.error('Error calling local LLM:', error);
      
      // Create a fallback response that won't cause issues
      const fallbackResponse = "I encountered an issue processing your request. The LLM server may not be responding correctly. Please check the server or try again later.";
      
      // Still save the error message to the database
      if (options.episodeId) {
        await this.saveMessageToDb({
          episodeId: options.episodeId,
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date()
        });
      }
      
      return fallbackResponse;
    }
  }

  /**
   * Send a message to the local LLM with a structured prompt expecting JSON output
   */
  async sendStructuredMessage(
    messages: ChatMessage[],
    schema: object,
    options: ChatCompletionOptions = {}
  ): Promise<StructuredResponse> {
    // Create a system prompt that includes the JSON schema
    const systemPrompt = `
You are a medical assistant that responds in JSON format.
Follow this response schema exactly: ${JSON.stringify(schema, null, 2)}
Respond with valid JSON only, no other text.`;
    
    try {
      const response = await this.sendMessage(
        [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        {
          ...options,
          temperature: options.temperature || 0.2, // Lower temperature for structured responses
          stop: [...(options.stop || []), '}\n']
        }
      );
      
      // Check if the response appears to be JSON (starts with a curly brace)
      if (response.trim().startsWith('{')) {
        try {
          // Make multiple attempts to fix and parse the JSON
          let parsed;
          // First try direct parsing
          try {
            parsed = JSON.parse(response);
          } catch (e) {
            // Try to fix common JSON issues
            let fixedJson = response;
            
            // Fix incomplete JSON by adding closing brace if needed
            if (!fixedJson.endsWith('}') && fixedJson.includes('{')) {
              fixedJson = fixedJson + '}';
            }
            
            // Remove any trailing commas before closing braces
            fixedJson = fixedJson.replace(/,\s*}/g, '}');
            
            // Try parsing again
            parsed = JSON.parse(fixedJson);
          }
          
          // Process extracted symptoms if available
          if (parsed.extracted_symptoms && options.episodeId) {
            await this.saveExtractedSymptoms(parsed.extracted_symptoms, options.episodeId);
          }
          
          return parsed;
        } catch (parseError) {
          console.error('Failed to parse LLM response as JSON:', parseError);
          console.log('Raw response:', response);
        }
      }
      
      // If we reach here, either the response wasn't JSON or parsing failed
      // Return a properly formatted response using the text content
      return {
        response: response,
        extracted_symptoms: []
      };
    } catch (error) {
      console.error('Error in structured message:', error);
      throw error;
    }
  }

  // Helper methods
  
  private formatPrompt(messages: ChatMessage[]): string {
    // Process all messages except the last one
    let prompt = '';
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const rolePrefix = msg.role === 'system' ? 'System: ' : 
                        msg.role === 'user' ? 'User: ' : 
                        'Medical Assistant: ';
      
      prompt += rolePrefix + msg.content + '\n\n';
    }
    
    // For the last message if it's from the user, add the assistant prompt to constrain the model
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      prompt += 'Medical Assistant: ';
    }
    
    return prompt;
  }

  private async saveMessageToDb(message: { 
    episodeId: number;
    role: string;
    content: string;
    timestamp: Date;
  }) {
    try {
      await db.messages.add({
        episodeId: message.episodeId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString()
      });
    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  }

  private async saveExtractedSymptoms(
    symptoms: Array<{name: string; present: boolean; confidence: number}>,
    episodeId: number
  ) {
    try {
      // Save each extracted symptom to the database
      for (const symptom of symptoms) {
        await db.symptoms.add({
          episodeId,
          name: symptom.name,
          present: symptom.present,
          confidence: symptom.confidence,
          extractedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving extracted symptoms:', error);
    }
  }
}

// Default export with singleton instance
export const chatService = new ChatService();
