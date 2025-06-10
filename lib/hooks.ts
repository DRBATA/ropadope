"use client"

import { useCallback, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { liveQuery } from "dexie"
import { db } from "./db"
import { useLiveQuery } from "dexie-react-hooks"
import { chatService, ChatMessage } from "./chat-service"

/**
 * Episode Management Hooks
 * @see /docs/hooks.md - Episode Management section
 */

// Hook to get all episodes
// @see /docs/hooks.md - useListEpisodes
export function useListEpisodes() {
  // Use liveQuery to reactively track episodes
  const episodes = useLiveQuery(
    () => db.episodes.orderBy("lastUpdatedAt").reverse().toArray()
  );
  
  // Get the createEpisode function
  const createEpisodeMutation = useCreateEpisode();
  const createEpisode = useCallback(async (episodeData: { title: string }) => {
    return await createEpisodeMutation.mutateAsync(episodeData);
  }, [createEpisodeMutation]);
  
  return { episodes, createEpisode };
}

// For compatibility with the chat page
// @see /docs/hooks.md - useListEpisodes
export function useEpisodes() {
  return useListEpisodes();
}

// Hook to get details for a specific episode
// @see /docs/hooks.md - useEpisodeDetails
export function useEpisodeDetails(episodeId: number) {
  return useLiveQuery(
    () => db.episodes.get(episodeId)
  );
}

// Core implementation for episode mutations
function useEpisodeMutation() {
  const queryClient = useQueryClient();
  
  return {
    create: useMutation({
      mutationFn: async (episodeData: { title: string } = { title: 'New Consultation' }) => {
        const id = await db.episodes.add({
          ...episodeData,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
          closed: false
        });
        return id;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["episodes"] });
      }
    }),
    
    close: useMutation({
      mutationFn: async (episodeId: number) => {
        await db.episodes.update(episodeId, {
          closed: true,
          lastUpdatedAt: new Date()
        });
        return episodeId;
      },
      onSuccess: (episodeId) => {
        queryClient.invalidateQueries({ queryKey: ["episodes"] });
        queryClient.invalidateQueries({ queryKey: ["episodes", episodeId] });
      }
    }),
    
    update: useMutation({
      mutationFn: async ({ 
        id, 
        data 
      }: { 
        id: number; 
        data: Partial<{ title: string; closed: boolean }> 
      }) => {
        await db.episodes.update(id, {
          ...data,
          lastUpdatedAt: new Date()
        });
        return id;
      },
      onSuccess: (episodeId) => {
        queryClient.invalidateQueries({ queryKey: ["episodes"] });
        queryClient.invalidateQueries({ queryKey: ["episodes", episodeId] });
      }
    })
  };
}

// Hook to create a new episode
// @see /docs/hooks.md - useCreateEpisode
export function useCreateEpisode() {
  const mutations = useEpisodeMutation();
  return mutations.create;
}

// Hook to close an episode
// @see /docs/hooks.md - useCloseEpisode
export function useCloseEpisode() {
  const mutations = useEpisodeMutation();
  return mutations.close;
}

// Hook to update an episode
// @see /docs/hooks.md - useUpdateEpisode
export function useUpdateEpisode() {
  const mutations = useEpisodeMutation();
  return mutations.update;
}

/**
 * Message Management Hooks
 * @see /docs/hooks.md - Message Management section
 */

// Core implementation for message queries
function useMessageQueries() {
  const queryClient = useQueryClient();
  
  return {
    episodeMessages: (episodeId: number) => {
      // Initial fetch of messages
      const query = useQuery({
        queryKey: ["messages", episodeId],
        queryFn: async () => {
          return await db.messages.where({ episodeId }).sortBy("timestamp")
        },
        staleTime: Infinity // Don't refetch as we'll use liveQuery for updates
      });
      
      // Subscribe to live updates
      useEffect(() => {
        const subscription = liveQuery(() => db.messages.where({ episodeId }).sortBy("timestamp"))
          .subscribe(
            (messages) => {
              queryClient.setQueryData(["messages", episodeId?.toString() || ""], messages)
            },
            (error) => {
              console.error("Error in liveQuery subscription:", error)
            }
          )
        
        return () => {
          subscription.unsubscribe()
        }
      }, [episodeId, queryClient]);
      
      return query;
    },
    
    messageDetails: (messageId: number) => {
      return useQuery({
        queryKey: ["message", messageId],
        queryFn: async () => {
          return await db.messages.get(messageId);
        },
        staleTime: Infinity
      });
    }
  }
}

// Core implementation for message mutations
function useMessageMutation() {
  const queryClient = useQueryClient();
  
  return {
    send: useMutation({
      mutationFn: async ({ 
        episodeId, 
        content, 
        role = "user" 
      }: { 
        episodeId: number; 
        content: string; 
        role?: "user" | "assistant" | "system" 
      }) => {
        // Add message to database
        const id = await db.messages.add({
          episodeId,
          content,
          role: role === 'system' ? 'assistant' : role, // Map system to assistant since our schema only has user/assistant
          timestamp: new Date()
        });
        
        // Only send to LLM if it's a user message
        if (role === "user") {
          // Get the conversation history
          const messages = await db.messages
            .where({ episodeId })
            .sortBy("timestamp");
          
          // Format for the LLM
          const formattedMessages: ChatMessage[] = messages.map(msg => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.content
          }));
          
          // Add a system message if there isn't one
          if (!formattedMessages.some(msg => msg.role === "system")) {
            formattedMessages.unshift({
              role: "system",
              content: "You are a helpful medical assistant. Extract symptoms from user messages and provide helpful advice."
            });
          }
          
          try {
            // Call the structured API with our schema
            const schema = {
              type: "object",
              required: ["response"],
              properties: {
                greeting: { type: "string" },
                response: { type: "string" },
                follow_up: { type: "string" },
                extracted_symptoms: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["name", "present", "confidence"],
                    properties: {
                      name: { type: "string" },
                      present: { type: "boolean" },
                      confidence: { type: "number" },
                      duration: { type: "string" },
                      severity: { type: "string" }
                    }
                  }
                },
                metadata: {
                  type: "object",
                  properties: {
                    age_group: { type: "string", enum: ["child", "adult", "senior"] },
                    language: { type: "string" }
                  }
                }
              }
            };
            
            // Send to LLM (with a timeout)
            const responsePromise = chatService.sendStructuredMessage(
              formattedMessages,
              schema,
              { episodeId }
            );
            
            // Add a timeout to handle slow responses - increased to 60 seconds for TinyLlama
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("LLM response timeout")), 60000); // Increased from 15s to 60s
            });
            
            let response;
            try {
              response = await Promise.race([responsePromise, timeoutPromise]);
            } catch (error) {
              console.error("Error getting LLM response:", error);
              response = { response: "I'm sorry, I couldn't process that request. The model might need more time to respond." };
            }
            
            // Save the assistant response
            await db.messages.add({
              episodeId,
              content: JSON.stringify(response),
              role: "assistant",
              timestamp: new Date()
            });
            
            return id;
          } catch (error) {
            console.error("Error sending message:", error);
            
            // Add fallback message
            await db.messages.add({
              episodeId,
              content: "I'm sorry, I couldn't connect to the language model. Please check your connection and try again.",
              role: "assistant",
              timestamp: new Date()
            });
            
            throw error;
          }
        }
        
        return id;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["messages", variables.episodeId] });
        if (variables.role === "user") {
          queryClient.invalidateQueries({ queryKey: ["symptoms", variables.episodeId] });
        }
      }
    }),
    
    delete: useMutation({
      mutationFn: async (messageId: number) => {
        const message = await db.messages.get(messageId);
        if (!message) throw new Error("Message not found");
        
        await db.messages.delete(messageId);
        return { messageId, episodeId: message.episodeId };
      },
      onSuccess: ({ episodeId }) => {
        queryClient.invalidateQueries({ queryKey: ["messages", episodeId] });
      }
    })
  };
}

// Hook to subscribe to episode messages with live updates
// @see /docs/hooks.md - useEpisodeMessages
export function useEpisodeMessages(episodeId: number) {
  const queries = useMessageQueries();
  return queries.episodeMessages(episodeId);
}

// Hook to get message details
// @see /docs/hooks.md - useMessageDetails
export function useMessageDetails(messageId: number) {
  const queries = useMessageQueries();
  return queries.messageDetails(messageId);
}

// Wrapper hook for useEpisodeMessages to maintain chat page compatibility
// @see /docs/hooks.md - useMessages
export function useMessages(episodeId: number) {
  const messagesQuery = useEpisodeMessages(episodeId);
  return { messages: messagesQuery.data || [] };
}

// Hook to send a message
// @see /docs/hooks.md - useSendMessage
export function useSendMessage() {
  const mutations = useMessageMutation();
  const mutate = mutations.send.mutate;
  const isPending = mutations.send.isPending;
  
  // Create a wrapper that handles both old and new parameter styles
  const sendMessage = async (episodeIdOrParams: number | { episodeId: number, content: string, role?: string }, content?: string) => {
    if (typeof episodeIdOrParams === 'number' && typeof content === 'string') {
      // Old style: sendMessage(episodeId, content)
      return mutate({ 
        episodeId: episodeIdOrParams, 
        content: content,
        role: 'user'
      });
    } else {
      // New style: sendMessage({ episodeId, content, role })
      return mutate(episodeIdOrParams as { episodeId: number, content: string, role?: string });
    }
  };
  
  return { sendMessage, isLoading: isPending };
}

// Hook to delete a message
// @see /docs/hooks.md - useDeleteMessage
export function useDeleteMessage() {
  const mutations = useMessageMutation();
  return mutations.delete;
}

/**
 * Symptom Management Hooks
 * @see /docs/hooks.md - Symptom Management section
 */

// Core implementation for symptom queries
function useSymptomQueries() {
  const queryClient = useQueryClient();
  
  return {
    episodeSymptoms: (episodeId: number) => {
      const query = useQuery({
        queryKey: ["symptoms", episodeId],
        queryFn: async () => {
          return await db.symptoms.where({ episodeId }).toArray()
        },
        staleTime: Infinity
      });
      
      useEffect(() => {
        const subscription = liveQuery(() => db.symptoms.where({ episodeId }).toArray())
          .subscribe(
            (symptoms) => {
              queryClient.setQueryData(["symptoms", episodeId], symptoms)
            },
            (error) => {
              console.error("Error in symptoms liveQuery:", error)
            }
          )
        
        return () => {
          subscription.unsubscribe()
        }
      }, [episodeId, queryClient]);
      
      return query;
    },
    
    symptomDetails: (symptomId: number) => {
      return useQuery({
        queryKey: ["symptom", symptomId],
        queryFn: async () => {
          return await db.symptoms.get(symptomId);
        },
        staleTime: Infinity
      });
    }
  };
}

// Core implementation for symptom mutations
function useSymptomMutation() {
  const queryClient = useQueryClient();
  
  return {
    update: useMutation({
      mutationFn: async ({
        id,
        updates
      }: {
        id: number;
        updates: Partial<{
          present: boolean;
          confidence: number;
          severity: "mild" | "moderate" | "severe";
          duration: string;
        }>
      }) => {
        await db.symptoms.update(id, {
          ...updates,
          lastUpdated: new Date()
        });
        
        // Get the updated symptom to return it
        const updatedSymptom = await db.symptoms.get(id);
        return updatedSymptom;
      },
      onSuccess: (symptom) => {
        if (symptom) {
          queryClient.invalidateQueries({ queryKey: ["symptoms", symptom.episodeId] });
          queryClient.invalidateQueries({ queryKey: ["symptom", symptom.id] });
        }
      }
    }),
    
    extract: useMutation({
      mutationFn: async ({ 
        episodeId, 
        messageId 
      }: { 
        episodeId: number; 
        messageId: number 
      }) => {
        // Get the message
        const message = await db.messages.get(messageId);
        if (!message) throw new Error("Message not found");
        
        // Try to parse the message content as JSON
        try {
          const messageData = JSON.parse(message.content);
          
          // Check if it contains extracted symptoms
          if (messageData.extracted_symptoms && Array.isArray(messageData.extracted_symptoms)) {
            // Add each symptom to the database
            const symptomIds = await Promise.all(
              messageData.extracted_symptoms.map(async (symptom: any) => {
                return await db.symptoms.add({
                  episodeId,
                  name: symptom.name,
                  present: symptom.present,
                  confidence: symptom.confidence,
                  severity: symptom.severity,
                  duration: symptom.duration,
                  messageId,
                  createdAt: new Date(),
                  lastUpdated: new Date()
                });
              })
            );
            
            return symptomIds;
          }
          
          return [];
        } catch (error) {
          console.error("Error extracting symptoms:", error);
          return [];
        }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["symptoms", variables.episodeId] });
      }
    })
  };
}

// Hook to subscribe to extracted symptoms for an episode
// @see /docs/hooks.md - useEpisodeSymptoms
export function useEpisodeSymptoms(episodeId: number) {
  const queries = useSymptomQueries();
  return queries.episodeSymptoms(episodeId);
}

// Hook to get details about a specific symptom
// @see /docs/hooks.md - useSymptomDetails
export function useSymptomDetails(symptomId: number) {
  const queries = useSymptomQueries();
  return queries.symptomDetails(symptomId);
}

// Hook to update symptom status (present, absent, etc)
// @see /docs/hooks.md - useUpdateSymptom
export function useUpdateSymptom() {
  const mutations = useSymptomMutation();
  return mutations.update;
}

// Hook to extract symptoms from message content
// @see /docs/hooks.md - useExtractSymptoms
export function useExtractSymptoms() {
  const mutations = useSymptomMutation();
  return mutations.extract;
}

/**
 * Condition Management Hooks
 * @see /docs/hooks.md - Condition Management section
 */

// Core implementation for condition queries and mutations
function useConditionQueries() {
  const queryClient = useQueryClient();
  
  return {
    episodeConditions: (episodeId: number) => {
      const query = useQuery({
        queryKey: ["conditions", episodeId],
        queryFn: async () => {
          return await db.conditions.where({ episodeId }).toArray()
        },
        staleTime: Infinity
      });
      
      useEffect(() => {
        const subscription = liveQuery(() => db.conditions.where({ episodeId }).toArray())
          .subscribe(
            (conditions) => {
              queryClient.setQueryData(["conditions", episodeId], conditions)
            },
            (error) => {
              console.error("Error in conditions liveQuery:", error)
            }
          )
        
        return () => {
          subscription.unsubscribe()
        }
      }, [episodeId, queryClient]);
      
      return query;
    },
    
    conditionDetails: (conditionId: number) => {
      return useQuery({
        queryKey: ["condition", conditionId],
        queryFn: async () => {
          return await db.conditions.get(conditionId);
        },
        staleTime: Infinity
      });
    }
  };
}

// Hook to get all conditions for an episode
// @see /docs/hooks.md - useEpisodeConditions
export function useEpisodeConditions(episodeId: number) {
  const queries = useConditionQueries();
  return queries.episodeConditions(episodeId);
}

// Hook to get details of a specific condition
// @see /docs/hooks.md - useConditionDetails
export function useConditionDetails(conditionId: number) {
  const queries = useConditionQueries();
  return queries.conditionDetails(conditionId);
}

/**
 * Bayesian Inference Hooks
 * @see /docs/hooks.md - Bayesian Inference section
 */

// Core implementation for Bayesian posterior probability mutations
function usePosteriorMutation() {
  const queryClient = useQueryClient();
  
  return {
    update: useMutation({
      mutationFn: async ({ 
        episodeId, 
        conditionId, 
        probability 
      }: { 
        episodeId: number; 
        conditionId: number; 
        probability: number 
      }) => {
        // Check if posterior exists
        const existing = await db.posteriors
          .where({ episodeId, conditionId })
          .first();
        
        let id;
        if (existing) {
          // Update existing posterior
          await db.posteriors.update(existing.id, {
            probability,
            updatedAt: new Date()
          });
          id = existing.id;
        } else {
          // Create new posterior
          id = await db.posteriors.add({
            episodeId,
            conditionId,
            probability,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        return id;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["posteriors", variables.episodeId] });
      }
    }),
    
    calculate: useMutation({
      mutationFn: async ({ episodeId }: { episodeId: number }) => {
        // In a real implementation, this would call the Bayesian engine via WASM
        // For now, we'll just get symptoms and conditions and create mock posteriors
        
        // Get symptoms and conditions for this episode
        const symptoms = await db.symptoms.where({ episodeId }).toArray();
        const conditions = await db.conditions.where({ episodeId }).toArray();
        
        // Simple mock implementation - in real app would be replaced by Bayesian engine
        const posteriors = await Promise.all(
          conditions.map(async (condition) => {
            // Very basic mock calculation based on symptom count - would be replaced with actual Bayesian inference
            const presentSymptoms = symptoms.filter(s => s.present).length;
            const totalSymptoms = symptoms.length;
            const mockProbability = Math.min(0.05 + (presentSymptoms / Math.max(totalSymptoms, 1)) * 0.95, 1);
            
            // Check if posterior exists
            const existing = await db.posteriors
              .where({ episodeId, conditionId: condition.id })
              .first();
            
            let id;
            if (existing) {
              // Update existing posterior
              await db.posteriors.update(existing.id, {
                probability: mockProbability,
                updatedAt: new Date()
              });
              id = existing.id;
            } else {
              // Create new posterior
              id = await db.posteriors.add({
                episodeId,
                conditionId: condition.id,
                probability: mockProbability,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
            
            return id;
          })
        );
        
        return posteriors;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["posteriors", variables.episodeId] });
      }
    })
  };
}

// Hook to get posteriors (Bayesian probabilities) for an episode
// @see /docs/hooks.md - useEpisodePosteriors
export function useEpisodePosteriors(episodeId: number) {
  const queries = usePosteriorQueries();
  return queries.episodePosteriors(episodeId);
}

// Hook to manually update posterior probabilities
// @see /docs/hooks.md - useUpdatePosterior
export function useUpdatePosterior() {
  const mutations = usePosteriorMutation();
  return mutations.update;
}

// Hook to calculate posteriors using the Bayesian engine
// @see /docs/hooks.md - useCalculatePosteriors
export function useCalculatePosteriors() {
  const mutations = usePosteriorMutation();
  return mutations.calculate;
}

/**
 * AI/LLM Integration Hooks
 * @see /docs/hooks.md - AI/LLM Integration section
 */

// Core implementation for LLM operations
function useLLMMutation() {
  const queryClient = useQueryClient();
  
  return {
    processMessage: useMutation({
      mutationFn: async ({
        episodeId,
        userInput,
        schema
      }: {
        episodeId: number;
        userInput: string;
        schema?: any;
      }) => {
        // Get conversation history
        const messages = await db.messages
          .where({ episodeId })
          .sortBy("timestamp");
        
        // Format for the LLM
        const formattedMessages: ChatMessage[] = messages.map(msg => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content
        }));
        
        // Add a system message if there isn't one
        if (!formattedMessages.some(msg => msg.role === "system")) {
          formattedMessages.unshift({
            role: "system",
            content: "You are a helpful medical assistant. Extract symptoms from user messages and provide helpful advice."
          });
        }
        
        // Add the new user message to the database
        const msgId = await db.messages.add({
          episodeId,
          content: userInput,
          role: "user",
          timestamp: new Date()
        });
        
        // Default schema if none provided
        const defaultSchema = {
          type: "object",
          required: ["response"],
          properties: {
            greeting: { type: "string" },
            response: { type: "string" },
            follow_up: { type: "string" },
            extracted_symptoms: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "present", "confidence"],
                properties: {
                  name: { type: "string" },
                  present: { type: "boolean" },
                  confidence: { type: "number" },
                  duration: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            metadata: {
              type: "object",
              properties: {
                age_group: { type: "string", enum: ["child", "adult", "senior"] },
                language: { type: "string" }
              }
            }
          }
        };
        
        // Use provided schema or default
        const validationSchema = schema || defaultSchema;
        
        try {
          // Add the new message to the formatted messages
          formattedMessages.push({ role: "user", content: userInput });
          
          // Send to LLM with timeout
          const responsePromise = chatService.sendStructuredMessage(
            formattedMessages,
            validationSchema,
            { episodeId }
          );
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("LLM response timeout")), 15000);
          });
          
          const response = await Promise.race([responsePromise, timeoutPromise])
            .catch(error => {
              console.error("Error getting LLM response:", error);
              return { response: "I'm sorry, I couldn't process that request. Please try again." };
            }) as any;
          
          // Save the assistant response
          const assistantMsgId = await db.messages.add({
            episodeId,
            content: JSON.stringify(response),
            role: "assistant",
            timestamp: new Date()
          });
          
          return { 
            userMessageId: msgId, 
            assistantMessageId: assistantMsgId, 
            response 
          };
        } catch (error) {
          console.error("Error processing message:", error);
          
          // Add fallback message
          const fallbackMsgId = await db.messages.add({
            episodeId,
            content: "I'm sorry, I couldn't connect to the language model. Please check your connection and try again.",
            role: "assistant",
            timestamp: new Date()
          });
          
          throw error;
        }
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["messages", variables.episodeId] });
        // Note: symptom extraction will need to be triggered separately
      }
    }),
    
    generateRecommendations: useMutation({
      mutationFn: async ({ episodeId }: { episodeId: number }) => {
        // Get symptoms and conditions for this episode
        const symptoms = await db.symptoms.where({ episodeId }).toArray();
        const posteriors = await db.posteriors.where({ episodeId }).toArray();
        const conditions = await db.conditions.where({ episodeId }).toArray();
        
        // Format the data for the LLM
        const formattedSymptoms = symptoms.map(s => ({
          name: s.name,
          present: s.present,
          confidence: s.confidence,
          severity: s.severity,
          duration: s.duration
        }));
        
        // Get the top conditions based on posterior probabilities
        const topConditions = posteriors
          .sort((a, b) => b.probability - a.probability)
          .slice(0, 3)
          .map(p => {
            const condition = conditions.find(c => c.id === p.conditionId);
            return {
              name: condition?.name || 'Unknown condition',
              probability: p.probability
            };
          });
        
        // Create the prompt
        const prompt = [
          {
            role: "system",
            content: "You are a medical assistant generating recommendations based on symptoms and possible conditions."
          },
          {
            role: "user",
            content: JSON.stringify({
              symptoms: formattedSymptoms,
              top_conditions: topConditions
            })
          }
        ];
        
        // Define the schema for recommendations
        const schema = {
          type: "object",
          required: ["recommendations"],
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                required: ["type", "content"],
                properties: {
                  type: { type: "string", enum: ["self_care", "follow_up", "urgent_care", "lifestyle"] },
                  title: { type: "string" },
                  content: { type: "string" },
                  urgency: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            },
            summary: { type: "string" }
          }
        };
        
        // Send to LLM
        const response = await chatService.sendStructuredMessage(prompt, schema, { episodeId });
        
        // Store the recommendations
        // In a real application, we would store these in a recommendations table
        // For now, we'll store them as a message
        const messageId = await db.messages.add({
          episodeId,
          content: JSON.stringify(response),
          role: "assistant",
          timestamp: new Date()
        });
        
        return { messageId, recommendations: response };
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["messages", variables.episodeId] });
      }
    })
  };
}

// Hook to process a user message through the LLM and update database
// @see /docs/hooks.md - useProcessMessage
export function useProcessMessage() {
  const mutations = useLLMMutation();
  return mutations.processMessage;
}

// Hook to generate recommendations based on symptoms and conditions
// @see /docs/hooks.md - useGenerateRecommendations
export function useGenerateRecommendations() {
  const mutations = useLLMMutation();
  return mutations.generateRecommendations;
}

// Custom hook to parse structured responses
export function useStructuredMessage(messageContent: string) {
  const [parsedMessage, setParsedMessage] = useState<any>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!messageContent) {
      setParsedMessage(null)
      setParseError(null)
      return
    }
    
    try {
      const parsed = JSON.parse(messageContent)
      setParsedMessage(parsed)
      setParseError(null)
    } catch (error) {
      console.error("Failed to parse message content as JSON:", error)
      setParseError("Invalid JSON structure")
      setParsedMessage(null)
    }
  }, [messageContent])
  
  return { parsedMessage, parseError }
}
