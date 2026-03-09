#!/bin/bash
# Phase 3: Results API Tests
BASE="http://localhost:4010/api"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1 - $2"; FAIL=$((FAIL+1)); }

echo "=== Phase 3 Results API Tests ==="
echo ""

# 1. 교사 등록 + 로그인
echo "[Setup] Register & Login teacher..."
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-phase3@test.com","password":"test1234","name":"Phase3 Tester"}' > /dev/null 2>&1

LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-phase3@test.com","password":"test1234"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "  FATAL: Login failed"
  echo "$LOGIN"
  exit 1
fi
echo "  Token obtained"

# 2. 세션 생성
echo ""
echo "[Setup] Create session..."
SESSION=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Phase3 Test Session","topicCount":2,"topicDuration":120}')
SESSION_ID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['id'])" 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
  echo "  FATAL: Session creation failed"
  exit 1
fi
echo "  Session ID: $SESSION_ID"

# 3. 세션 활성화
echo ""
echo "[Setup] Activate session..."
curl -s -X PATCH "$BASE/sessions/$SESSION_ID/activate" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo "  Session activated"

# ============ Phase 3 Tests ============

echo ""
echo "--- Test 1: Save result (no auth required) ---"
SAVE_BODY=$(curl -s -X POST "$BASE/sessions/$SESSION_ID/results" \
  -H "Content-Type: application/json" \
  -d '{
    "studentName": "홍길동",
    "studentId": "2024001",
    "interviewMode": "chat",
    "topicsData": {
      "extractedText": "테스트 과제 텍스트",
      "topics": [
        {"id":"t1","title":"주제1","timeUsed":90,"timeLimit":120,"conversations":[
          {"role":"ai","text":"질문1"},{"role":"student","text":"답변1"},
          {"role":"ai","text":"질문2"},{"role":"student","text":"답변2"}
        ]},
        {"id":"t2","title":"주제2","timeUsed":60,"timeLimit":120,"conversations":[
          {"role":"ai","text":"주제2 질문"},{"role":"student","text":"주제2 답변"}
        ]}
      ]
    },
    "summary": {
      "strengths": ["개념 이해가 우수합니다","논리적으로 설명합니다"],
      "weaknesses": ["세부 사항 보충 필요"],
      "overallComment": "전반적으로 좋은 이해도를 보여주었습니다."
    },
    "startedAt": "2024-01-15T10:00:00Z"
  }')
RESULT_ID=$(echo "$SAVE_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('resultId',''))" 2>/dev/null)

if [ -n "$RESULT_ID" ] && [ "$RESULT_ID" != "" ]; then
  pass "Save result (resultId=$RESULT_ID)"
else
  fail "Save result" "$SAVE_BODY"
fi

echo ""
echo "--- Test 2: Save result validation (missing fields) ---"
VAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/sessions/$SESSION_ID/results" \
  -H "Content-Type: application/json" \
  -d '{"studentName": ""}')
if [ "$VAL_CODE" = "400" ]; then
  pass "Validation rejects empty studentName (400)"
else
  fail "Validation" "Expected 400, got $VAL_CODE"
fi

echo ""
echo "--- Test 3: List results (teacher auth) ---"
LIST_BODY=$(curl -s "$BASE/sessions/$SESSION_ID/results" \
  -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$LIST_BODY" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('results',[])))" 2>/dev/null)

if [ "$COUNT" -ge 1 ] 2>/dev/null; then
  pass "List results (count=$COUNT)"
else
  fail "List results" "count=$COUNT, body=$LIST_BODY"
fi

echo ""
echo "--- Test 4: List results without auth ---"
NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/sessions/$SESSION_ID/results")
if [ "$NO_AUTH" = "401" ]; then
  pass "List results without auth rejected (401)"
else
  fail "List results auth" "Expected 401, got $NO_AUTH"
fi

echo ""
echo "--- Test 5: Get result detail (teacher auth) ---"
DETAIL_BODY=$(curl -s "$BASE/results/$RESULT_ID" \
  -H "Authorization: Bearer $TOKEN")
STUDENT=$(echo "$DETAIL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['student_name'])" 2>/dev/null)
TOPICS_COUNT=$(echo "$DETAIL_BODY" | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print(len(r['topics_data']['topics']))" 2>/dev/null)

if [ "$STUDENT" = "홍길동" ] && [ "$TOPICS_COUNT" = "2" ]; then
  pass "Get result detail (student=$STUDENT, topics=$TOPICS_COUNT)"
else
  fail "Get result detail" "student=$STUDENT, topics=$TOPICS_COUNT"
fi

echo ""
echo "--- Test 6: Get session stats (teacher auth) ---"
STATS_BODY=$(curl -s "$BASE/sessions/$SESSION_ID/stats" \
  -H "Authorization: Bearer $TOKEN")
RCOUNT=$(echo "$STATS_BODY" | python3 -c "import sys,json; print(int(json.load(sys.stdin)['stats']['result_count']))" 2>/dev/null)

if [ "$RCOUNT" -ge 1 ] 2>/dev/null; then
  pass "Get session stats (result_count=$RCOUNT)"
else
  fail "Get session stats" "result_count=$RCOUNT, body=$STATS_BODY"
fi

echo ""
echo "--- Test 7: Save second result ---"
SAVE2_BODY=$(curl -s -X POST "$BASE/sessions/$SESSION_ID/results" \
  -H "Content-Type: application/json" \
  -d '{
    "studentName": "김철수",
    "interviewMode": "voice",
    "topicsData": {"extractedText":"test","topics":[{"id":"t1","title":"주제","timeUsed":30,"timeLimit":120,"conversations":[{"role":"ai","text":"Q"},{"role":"student","text":"A"}]}]},
    "summary": {"strengths":["Good"],"weaknesses":["Needs work"],"overallComment":"OK"},
    "startedAt": "2024-01-15T11:00:00Z"
  }')
RESULT_ID2=$(echo "$SAVE2_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('resultId',''))" 2>/dev/null)

if [ -n "$RESULT_ID2" ]; then
  pass "Save second result (resultId=$RESULT_ID2)"
else
  fail "Save second result" "$SAVE2_BODY"
fi

echo ""
echo "--- Test 8: Delete result (teacher auth) ---"
DEL_BODY=$(curl -s -X DELETE "$BASE/results/$RESULT_ID2" \
  -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$DEL_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
  pass "Delete result"
else
  fail "Delete result" "success=$SUCCESS, body=$DEL_BODY"
fi

echo ""
echo "--- Test 9: Verify delete (get deleted result returns 404) ---"
DEL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/results/$RESULT_ID2" \
  -H "Authorization: Bearer $TOKEN")
if [ "$DEL_CHECK" = "404" ]; then
  pass "Deleted result returns 404"
else
  fail "Deleted result check" "Expected 404, got $DEL_CHECK"
fi

echo ""
echo "--- Test 10: Save result to invalid session ---"
INVALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/sessions/00000000-0000-0000-0000-000000000000/results" \
  -H "Content-Type: application/json" \
  -d '{"studentName":"Test","interviewMode":"chat","topicsData":{"topics":[]},"startedAt":"2024-01-01T00:00:00Z"}')
if [ "$INVALID" = "404" ]; then
  pass "Invalid session returns 404"
else
  fail "Invalid session" "Expected 404, got $INVALID"
fi

# ============ Cleanup ============
echo ""
echo "[Cleanup] Close session and delete remaining result..."
curl -s -X PATCH "$BASE/sessions/$SESSION_ID/close" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE/results/$RESULT_ID" -H "Authorization: Bearer $TOKEN" > /dev/null

echo ""
echo "================================="
echo "Results: $PASS passed, $FAIL failed (total $((PASS+FAIL)))"
echo "================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
