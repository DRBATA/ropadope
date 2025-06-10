# EasyGP React Hooks Reference

This document provides a comprehensive reference for all custom React hooks used in the EasyGP application.

## Architecture Overview

The EasyGP hooks architecture follows a consistent pattern:

1. **Core Implementation Hooks** (internal, non-exported): Contain shared logic for related operations
   - Example: `useEpisodeMutation`, `useMessageQueries`

2. **Semantic Wrapper Hooks** (exported): Provide clear, descriptive interfaces
   - Example: `useCreateEpisode`, `useSendMessage`

3. **Compatibility Wrappers** (when needed): Maintain backward compatibility with existing components
   - Example: `useEpisodes` wrapping `useListEpisodes`

## Episode Management

### `useListEpisodes()`
- **Purpose**: Gets a list of all consultation episodes, ordered by recency
- **Returns**: `{ episodes, createEpisode }`
  - `episodes`: Array of Episode objects
  - `createEpisode`: Function to create a new episode
- **Usage**: `const { episodes, createEpisode } = useListEpisodes();`

### `useEpisodeDetails(episodeId)`
- **Purpose**: Gets detailed information for a specific episode
- **Parameters**: `episodeId` - The ID of the episode to retrieve
- **Returns**: Episode object with full details
- **Usage**: `const episodeDetails = useEpisodeDetails(episodeId);`

### `useCreateEpisode()`
- **Purpose**: Creates a new consultation episode
- **Returns**: Function to create a new episode with given properties
- **Usage**: `const createEpisode = useCreateEpisode(); createEpisode({ title: 'New Consultation' });`

### `useCloseEpisode()`
- **Purpose**: Marks an episode as completed/closed
- **Returns**: Function to close the episode with the given ID
- **Usage**: `const closeEpisode = useCloseEpisode(); closeEpisode(episodeId);`

## Message Management

### `useEpisodeMessages(episodeId)`
- **Purpose**: Gets messages for a specific episode with live updates
- **Parameters**: `episodeId` - The ID of the episode
- **Returns**: React Query result with messages array
- **Usage**: `const { data: messages, isLoading } = useEpisodeMessages(episodeId);`

### `useMessageDetails(messageId)`
- **Purpose**: Gets detailed information for a specific message
- **Parameters**: `messageId` - The ID of the message to retrieve
- **Returns**: React Query result with message object
- **Usage**: `const { data: message } = useMessageDetails(messageId);`

### `useMessages(episodeId)`
- **Purpose**: Compatibility wrapper for `useEpisodeMessages`
- **Parameters**: `episodeId` - The ID of the episode
- **Returns**: `{ messages, isLoading }`
- **Usage**: `const { messages } = useMessages(currentEpisodeId);`

### `useSendMessage()`
- **Purpose**: Sends a new message to the chat
- **Returns**: Mutation function to send a message
- **Usage**: `const { mutate: sendMessage, isPending: isLoading } = useSendMessage(); sendMessage({ episodeId, content: 'Hello', role: 'user' });`

### `useDeleteMessage()`
- **Purpose**: Deletes a message from an episode
- **Returns**: Mutation function to delete a message
- **Usage**: `const { mutate: deleteMessage } = useDeleteMessage(); deleteMessage({ episodeId, messageId });`

## Symptom Management

### `useEpisodeSymptoms(episodeId)`
- **Purpose**: Gets symptoms for a specific episode with live updates
- **Parameters**: `episodeId` - The ID of the episode
- **Returns**: React Query result with symptoms array
- **Usage**: `const { data: symptoms, isLoading } = useEpisodeSymptoms(episodeId);`

### `useSymptomDetails(symptomId)`
- **Purpose**: Gets detailed information for a specific symptom
- **Parameters**: `symptomId` - The ID of the symptom to retrieve
- **Returns**: React Query result with symptom object
- **Usage**: `const { data: symptom } = useSymptomDetails(symptomId);`

### `useUpdateSymptom()`
- **Purpose**: Updates symptom status (present, severity, confidence, etc.)
- **Returns**: Mutation function to update a symptom
- **Usage**: `const { mutate: updateSymptom } = useUpdateSymptom(); updateSymptom({ id: symptomId, updates: { present: true, severity: "moderate" } });`

### `useExtractSymptoms()`
- **Purpose**: Extracts symptoms from structured message content
- **Returns**: Mutation function to extract symptoms from a message
- **Usage**: `const { mutate: extractSymptoms } = useExtractSymptoms(); extractSymptoms({ episodeId, messageId });`

## Condition Management

### `useEpisodeConditions(episodeId)`
- **Purpose**: Gets conditions for a specific episode with live updates
- **Parameters**: `episodeId` - The ID of the episode
- **Returns**: React Query result with conditions array
- **Usage**: `const { data: conditions } = useEpisodeConditions(episodeId);`

### `useConditionDetails(conditionId)`
- **Purpose**: Gets detailed information for a specific condition
- **Parameters**: `conditionId` - The ID of the condition to retrieve
- **Returns**: React Query result with condition object
- **Usage**: `const { data: condition } = useConditionDetails(conditionId);`

## Bayesian Inference

### `useEpisodePosteriors(episodeId)`
- **Purpose**: Gets posterior probabilities for conditions in an episode
- **Parameters**: `episodeId` - The ID of the episode
- **Returns**: React Query result with posteriors array
- **Usage**: `const { data: posteriors } = useEpisodePosteriors(episodeId);`

### `useUpdatePosterior()`
- **Purpose**: Manually updates a posterior probability
- **Returns**: Mutation function to update a posterior
- **Usage**: `const { mutate: updatePosterior } = useUpdatePosterior(); updatePosterior({ episodeId, conditionId, probability: 0.75 });`

### `useCalculatePosteriors()`
- **Purpose**: Calculates posteriors using the Bayesian engine
- **Returns**: Mutation function to calculate posteriors
- **Usage**: `const { mutate: calculatePosteriors } = useCalculatePosteriors(); calculatePosteriors({ episodeId });`

## AI/LLM Integration

### `useProcessMessage()`
- **Purpose**: Processes a user message through the LLM and updates database
- **Returns**: Mutation function to process a message
- **Usage**: `const { mutate: processMessage } = useProcessMessage(); processMessage({ episodeId, userInput: "I have a headache." });`

### `useGenerateRecommendations()`
- **Purpose**: Generates recommendations based on symptoms and conditions
- **Returns**: Mutation function to generate recommendations
- **Usage**: `const { mutate: generateRecommendations } = useGenerateRecommendations(); generateRecommendations({ episodeId });`

### `useStructuredMessage(messageContent)`
- **Purpose**: Parses structured message content as JSON
- **Parameters**: `messageContent` - The message content to parse
- **Returns**: `{ parsedMessage, parseError }`
- **Usage**: `const { parsedMessage, parseError } = useStructuredMessage(message.content);`

## Clinical Pathways

### `usePathwayNavigation(pathwayId, episodeId)`
- **Purpose**: Manages navigation through a clinical pathway
- **Parameters**: 
  - `pathwayId` - The ID of the clinical pathway
  - `episodeId` - The ID of the episode
- **Returns**: Navigation state and functions
- **Usage**: `const { navigate, currentStep } = usePathwayNavigation(pathwayId, episodeId);`

### `useRecommendNextQuestion()`
- **Purpose**: Determines the most informative next question to ask based on current evidence
- **Returns**: Function that calculates the next best question to ask
- **Usage**: `const getNextQuestion = useRecommendNextQuestion(); const nextQuestion = getNextQuestion(episodeId);`

### `useLocalLLM()`
- **Purpose**: Hook to interact with the local LLM server
- **Returns**: Functions to send prompts and get responses from local LLM
- **Usage**: `const { sendPrompt, isProcessing } = useLocalLLM();`

### `useStreamingResponse()`
- **Purpose**: For handling streaming tokens from the LLM
- **Returns**: State and functions to handle streaming responses
- **Usage**: `const { tokens, isComplete } = useStreamingResponse(responseStream);`

## UTI Pathway Specific

### `useUTIPathway(episodeId)`
- **Purpose**: Manages the UTI clinical pathway state for a specific episode
- **Parameters**: `episodeId` - The ID of the episode
- **Returns**: Current pathway state and navigation functions
- **Usage**: `const { state, nextStep, previousStep } = useUTIPathway(episodeId);`

### `usePathwayNavigation()`
- **Purpose**: For navigating through generic clinical pathway states
- **Returns**: Navigation functions for clinical pathways
- **Usage**: `const { navigate, currentStep } = usePathwayNavigation(pathwayId, episodeId);`
