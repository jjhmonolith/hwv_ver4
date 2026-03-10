import base64
import io
import json

from fastapi import APIRouter, Request
from pydantic import BaseModel
from pypdf import PdfReader
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.openai_service import get_client, get_model

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10MB
PDF_MAGIC_BYTES = b"%PDF-"


class AnalyzeRequest(BaseModel):
    pdfBase64: str


class TopicItem(BaseModel):
    id: str
    title: str


class AnalyzeResponse(BaseModel):
    topics: list[TopicItem]
    text: str
    fallback: bool = False


FALLBACK_TOPICS = [
    TopicItem(id="t1", title="핵심 개념 이해"),
    TopicItem(id="t2", title="실제 적용 방법"),
    TopicItem(id="t3", title="학습 내용 정리"),
]


def extract_text_from_pdf(pdf_base64: str) -> str:
    """PDF에서 텍스트 추출"""
    pdf_bytes = base64.b64decode(pdf_base64)
    pdf_file = io.BytesIO(pdf_bytes)
    reader = PdfReader(pdf_file)

    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)

    return "\n".join(text_parts)


def generate_topics(text: str, topic_count: int = 3) -> list[TopicItem]:
    """GPT로 주제 추출"""
    client = get_client()
    response = client.chat.completions.create(
        model=get_model(),
        messages=[
            {
                "role": "system",
                "content": f"""당신은 과제 분석 전문가입니다.
주어진 과제 내용에서 학생의 이해도를 평가할 수 있는 핵심 주제 {topic_count}개를 추출하세요.

출력 형식 (JSON):
{{"topics": [{{"id": "t1", "title": "주제명"}}, ...]}}
""",
            },
            {"role": "user", "content": f"과제 내용:\n{text[:4000]}"},
        ],
        max_completion_tokens=500,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response from OpenAI")

    result = json.loads(content)

    if isinstance(result, dict) and "topics" in result:
        topics = result["topics"]
    elif isinstance(result, list):
        topics = result
    else:
        raise ValueError("Invalid response format")

    return [TopicItem(**t) for t in topics[:topic_count]]


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("5/minute")
async def analyze_pdf(request: Request, req: AnalyzeRequest):
    """PDF 분석 및 주제 추출"""
    try:
        # PDF 서버사이드 검증
        try:
            pdf_bytes = base64.b64decode(req.pdfBase64)
        except Exception:
            return AnalyzeResponse(
                topics=FALLBACK_TOPICS,
                text="유효하지 않은 파일 형식입니다.",
                fallback=True,
            )

        if len(pdf_bytes) > MAX_PDF_SIZE:
            return AnalyzeResponse(
                topics=FALLBACK_TOPICS,
                text="파일 크기가 10MB를 초과합니다.",
                fallback=True,
            )

        if not pdf_bytes[:5].startswith(PDF_MAGIC_BYTES):
            return AnalyzeResponse(
                topics=FALLBACK_TOPICS,
                text="PDF 파일만 업로드할 수 있습니다.",
                fallback=True,
            )

        text = extract_text_from_pdf(req.pdfBase64)

        if not text or len(text.strip()) < 50:
            return AnalyzeResponse(
                topics=FALLBACK_TOPICS,
                text="PDF에서 충분한 텍스트를 추출할 수 없습니다.",
                fallback=True,
            )

        topics = generate_topics(text)

        return AnalyzeResponse(
            topics=topics,
            text=text[:5000],
            fallback=False,
        )

    except ValueError as e:
        return AnalyzeResponse(
            topics=FALLBACK_TOPICS,
            text=str(e),
            fallback=True,
        )
    except Exception as e:
        print(f"Analyze error: {e}")
        return AnalyzeResponse(
            topics=FALLBACK_TOPICS,
            text="분석 중 오류가 발생했습니다.",
            fallback=True,
        )
