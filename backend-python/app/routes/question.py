from fastapi import APIRouter, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.services.openai_service import get_client, get_model

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class TopicInfo(BaseModel):
    id: str
    title: str


class QuestionRequest(BaseModel):
    topic: TopicInfo
    assignmentText: str
    previousQA: list[dict]
    studentAnswer: str
    interviewMode: str


class QuestionResponse(BaseModel):
    question: str
    fallback: bool = False


@router.post("/question", response_model=QuestionResponse)
@limiter.limit("20/minute")
async def generate_question(request: Request, req: QuestionRequest):
    """인터뷰 질문 생성"""
    try:
        client = get_client()

        messages = [
            {
                "role": "system",
                "content": f"""당신은 학생의 과제 이해도를 평가하는 면접관입니다.
주제: {req.topic.title}
과제 내용: {req.assignmentText[:2000]}

학생의 답변을 바탕으로 이해도를 확인하는 후속 질문을 생성하세요.
질문은 명확하고 구체적이어야 하며, 한국어로 작성하세요.
질문만 출력하세요. 다른 설명은 불필요합니다.""",
            },
        ]

        for qa in req.previousQA:
            role = "assistant" if qa.get("role") == "ai" else "user"
            messages.append({"role": role, "content": qa.get("text", "")})

        if req.studentAnswer:
            messages.append({"role": "user", "content": req.studentAnswer})

        response = client.chat.completions.create(
            model=get_model(),
            messages=messages,
            max_tokens=300,
        )

        content = response.choices[0].message.content or ""

        return QuestionResponse(question=content, fallback=False)

    except Exception as e:
        print(f"Question generation error: {e}")
        fallback_questions = [
            "이 과제에서 가장 중요한 개념은 무엇인가요?",
            "이 내용을 자신의 말로 설명해 주세요.",
            "이 과제를 통해 무엇을 배웠나요?",
        ]
        idx = len(req.previousQA) % len(fallback_questions)
        return QuestionResponse(question=fallback_questions[idx], fallback=True)
