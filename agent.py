import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Fetch the OpenRouter API key
api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    raise ValueError("❌ OPENROUTER_API_KEY not found in environment variables.")

# Initialize the OpenAI-compatible client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
    default_headers={
        "HTTP-Referer": "http://localhost:8000",  # Optional but helpful
        "X-Title": "Drug_Check_Project",
    }
)

# Maintain a global conversation history
conversation_history = [
    {
        "role": "system",
        "content": "You are a helpful medical assistant AI. Answer questions about medicines, health conditions, drug interactions, and general health advice clearly and safely. Avoid giving direct medical advice; instead, suggest seeing a healthcare professional when needed."
    }
]

# Function to ask the AI model
def ask_mistral(prompt):
    try:
        # Add user's message to the conversation history
        conversation_history.append({"role": "user", "content": prompt})

        # Send request to OpenRouter (Mistral model)
        response = client.chat.completions.create(
            model="mistralai/mistral-small-3.2-24b-instruct:free",
            messages=conversation_history
        )

        # Parse and extract the assistant's reply
        if response.choices and response.choices[0].message:
            reply = response.choices[0].message.content.strip()

            # Save assistant reply to history
            conversation_history.append({"role": "assistant", "content": reply})
            print("✅ Reply from OpenRouter:", reply)
            return reply
        else:
            return "⚠️ No valid response received from the model."

    except Exception as e:
        print("🔥 AI error:", str(e))
        return f"⚠️ Error occurred while contacting the AI: {str(e)}"
