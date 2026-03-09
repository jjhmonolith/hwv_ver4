import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.services.openai_service import get_client, get_model

chatkit_router = APIRouter()


@chatkit_router.post("/chatkit")
async def chatkit_handler(request: Request):
    """ChatKit SSE 프로토콜 구현"""
    body = await request.json()
    thread = body.get("thread", [])

    # 마지막 사용자 메시지 확인
    user_message = next(
        (m for m in reversed(thread) if m.get("role") == "user"),
        None,
    )

    if not user_message:
        return {"error": "No user message"}

    # 컨텍스트 정보 (과제 텍스트, 현재 주제 등)
    context = body.get("context", {})
    assignment_text = context.get("assignmentText", "")
    topic_title = context.get("topicTitle", "")

    system_prompt = f"""당신은 학생의 과제 이해도를 평가하는 면접관입니다.
학생과 한국어로 대화하며, 과제 내용에 대한 이해도를 확인합니다.

{f'현재 주제: {topic_title}' if topic_title else ''}
{f'과제 내용: {assignment_text[:2000]}' if assignment_text else ''}

규칙:
1. 한 번에 하나의 질문만 합니다.
2. 학생의 답변을 바탕으로 후속 질문을 합니다.
3. 질문은 명확하고 구체적이어야 합니다.
4. 격려하면서도 정확한 이해를 확인합니다."""

    async def generate():
        client = get_client()
        messages = [
            {"role": "system", "content": system_prompt},
            *[
                {"role": m["role"], "content": m["content"]}
                for m in thread
                if m.get("role") in ("user", "assistant")
            ],
        ]

        stream = client.chat.completions.create(
            model=get_model(),
            messages=messages,
            stream=True,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield f"data: {json.dumps({'type': 'text', 'content': delta.content})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
