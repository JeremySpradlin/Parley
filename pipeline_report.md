# Chat Pipeline and System Prompt Report

This document outlines the architecture of the chat pipeline, with a specific focus on how it handles system prompts for Anthropic and OpenAI models. This report can be used as a reference for replicating this pipeline in other applications.

## Overview

The application facilitates a conversation between two AI agents. The core of this functionality is managed by the `ConversationManager` class, which runs in a separate thread to keep the UI responsive.

## Key Components

-   **`ConversationManager`**: The central class that orchestrates the entire conversation flow.
-   **`AIConversationApp`**: The main PyQt6 window that handles the user interface and user interactions.
-   **`config.json`**: A configuration file that defines the models, providers, and other settings for the AI agents.

## Conversation Flow

1.  **Initialization**:
    *   The `AIConversationApp` loads settings from `config.json` and instantiates the `ConversationManager`.
    *   API clients for Anthropic and OpenAI are initialized within `ConversationManager` using API keys from environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).

2.  **Starting the Conversation**:
    *   When the user clicks "Start," the `start_conversation` method in `AIConversationApp` is called.
    *   This creates a new `ConversationManager` instance with the current configuration and starts its thread.
    *   The conversation begins with an initial prompt for the first AI (`ai1`), or a default greeting if none is provided.

3.  **The Conversation Loop (`run` method)**:
    *   The `run` method in `ConversationManager` contains the main loop that drives the conversation.
    *   It alternates turns between `ai1` and `ai2`.
    *   In each turn, it calls `get_ai_response` to get the next message from the current AI.
    *   The response is emitted via the `message_received` signal to update the UI.
    *   The conversation history is updated with each new message.
    *   A configurable delay (`message_delay`) is introduced between turns to control the pace of the conversation.
    *   The loop continues until a message limit is reached or the user stops the conversation.

## System Prompt Handling

The application uses a dynamic system prompt that is constructed just before making an API call. This ensures that the AI always has the correct context and persona for its next response.

### System Prompt Structure

The system prompt is created within the `get_ai_response` method using an f-string:

```python
system_prompt = f"""You are {speaker_id.upper()}. {persona}

You are having a conversation with another AI. Keep your responses conversational,
thoughtful, and engaging. Aim for 1-3 sentences unless the topic requires more depth."""
```

-   `speaker_id`: Identifies the AI (`ai1` or `ai2`).
-   `persona`: A configurable string that defines the AI's personality or role (e.g., "You are a helpful and friendly assistant.").

### Provider-Specific Implementation

The `get_ai_response` method determines which provider to use based on the `config.json` settings and then calls the appropriate private method (`_get_anthropic_response` or `_get_openai_response`).

#### Anthropic (`_get_anthropic_response`)

-   **System Prompt**: The `system_prompt` is passed directly to the `system` parameter in the `anthropic_client.messages.create` call.
-   **Conversation History**: The entire conversation history is transformed into the format required by the Anthropic API. The current speaker's previous messages are assigned the `"assistant"` role, and the other speaker's messages are assigned the `"user"` role. The latest message from the other AI is also added with a `"user"` role.

```python
# ... (building messages list from history) ...

response = self.anthropic_client.messages.create(
    model=model,
    max_tokens=self.config.get('max_tokens', 200),
    system=system_prompt,
    messages=messages
)
```

#### OpenAI (`_get_openai_response`)

-   **System Prompt**: The `system_prompt` is added as the first message in the `messages` list with the role `"system"`.
-   **Conversation History**: The history is formatted similarly to the Anthropic implementation, with alternating `"assistant"` and `"user"` roles.

```python
# Build conversation history for context
messages = [{"role": "system", "content": system_prompt}]

# ... (building the rest of the messages list from history) ...

response = self.openai_client.chat.completions.create(
    model=model,
    max_tokens=self.config.get('max_tokens', 200),
    messages=messages
)
```

## Replicating the Pipeline

To replicate this pipeline in another application, follow these steps:

1.  **Configuration**: Create a configuration mechanism (e.g., a JSON file) to specify the provider (`anthropic` or `openai`), model, persona, and other parameters for each AI agent.
2.  **API Clients**: Initialize the necessary API clients (Anthropic, OpenAI, etc.) using API keys stored securely (e.g., as environment variables).
3.  **Conversation Manager**: Implement a class similar to `ConversationManager` to manage the conversation state, including the history and the current speaker.
4.  **Dynamic System Prompts**: Construct system prompts dynamically before each API call to include the AI's persona and any other relevant context.
5.  **History Formatting**: Before each API call, format the conversation history according to the specific requirements of the provider's API. Pay close attention to the roles (`user`, `assistant`, `system`).
6.  **Provider-Specific API Calls**:
    *   For **Anthropic**, use the `system` parameter for the system prompt.
    *   For **OpenAI**, include the system prompt as the first message with the `"system"` role in the `messages` list.
7.  **Asynchronous Execution**: Run the conversation loop in a separate thread or use asynchronous operations to prevent blocking the main application thread.
8.  **Error Handling**: Implement robust error handling for API calls to manage issues like authentication failures, rate limits, and other API-specific errors. 