import os
from dotenv import load_dotenv
from google import genai
load_dotenv(os.path.join("scripts", ".env"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
for m in client.models.list_models():
    print(m.name)
