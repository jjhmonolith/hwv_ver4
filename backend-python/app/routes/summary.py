import json

from fastapi import APIRouter, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.openai_service import get_client, get_model

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class TopicInfo(BaseModel):
    title: str


class SummaryRequest(BaseModel):
    transcript: str
    topics: list[TopicInfo]
    assignmentText: str
    interviewMode: str


class SummaryResult(BaseModel):
    strengths: list[str]
    weaknesses: list[str]
    overallComment: str


class SummaryResponse(BaseModel):
    summary: SummaryResult
    fallback: bool = False


FALLBACK_SUMMARY = SummaryResult(
    strengths=["인터뷰를 완료하셨습니다."],
    weaknesses=["평가 생성에 실패했습니다. 나중에 다시 시도해주세요."],
    overallComment="기술적 문제로 상세 평가를 제공할 수 없습니다.",
)


@router.post("/summary", response_model=SummaryResponse)
@limiter.limit("5/minute")
async def generate_summary(request: Request, req: SummaryRequest):
    """인터뷰 결과 평가 생성"""
    try:
        client = get_client()
        topic_names = ", ".join([t.title for t in req.topics])

        response = client.chat.completions.create(
            model=get_model(),
            messages=[
                {
                    "role": "system",
                    "content": f"""당신은 학생 평가 전문가입니다.
학생이 과제에 대해 {req.interviewMode} 모드로 인터뷰를 진행했습니다.
다룬 주제: {topic_names}

대화 내용을 분석하여 다음 JSON 형식으로 평가를 작성하세요:
{{
  "strengths": ["강점1", "강점2", ...],
  "weaknesses": ["개선점1", "개선점2", ...],
  "overallComment": "전체적인 평가 코멘트"
}}

평가 기준:
1. 핵심 개념 이해도
2. 설명의 명확성
3. 실제 적용 능력
4. 논리적 사고력

강점과 약점은 각각 2-4개, 종합 코멘트는 2-3문장으로 작성하세요.""",
                },
                {
                    "role": "user",
                    "content": f"""과제 내용:
{req.assignmentText[:2000]}

인터뷰 대화:
{req.transcript[:4000]}""",
                },
            ],
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            return SummaryResponse(summary=FALLBACK_SUMMARY, fallback=True)

        result = json.loads(content)

        return SummaryResponse(
            summary=SummaryResult(
                strengths=result.get("strengths", ["평가를 확인할 수 없습니다."]),
                weaknesses=result.get("weaknesses", []),
                overallComment=result.get("overallComment", "평가 생성 완료"),
            ),
            fallback=False,
        )

    except Exception as e:
        print(f"Summary generation error: {e}")
        return SummaryResponse(summary=FALLBACK_SUMMARY, fallback=True)
