import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


def get_client() -> OpenAI:
    return client


def get_model() -> str:
    return DEFAULT_MODEL
