import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

from app.chatkit_server import chatkit_router
from app.routes import analyze, question, summary

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="HWV Ver.4 AI Backend")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 멀티 오리진 지원
frontend_urls = [
    url.strip()
    for url in os.getenv("FRONTEND_URL", "http://localhost:3000").split(",")
    if url.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "fastapi"}


# AI APIs
app.include_router(analyze.router, prefix="/api")
app.include_router(question.router, prefix="/api")
app.include_router(summary.router, prefix="/api")

# ChatKit 백엔드
app.include_router(chatkit_router, prefix="/api")
