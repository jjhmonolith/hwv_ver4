#!/bin/bash
# Phase 2: Auth + Sessions API Tests
BASE="http://localhost:4010/api"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1 - $2"; FAIL=$((FAIL+1)); }

echo "=== Phase 2 Auth + Sessions API Tests ==="
echo ""

# ============ Auth Tests ============

echo "--- Test 1: Register teacher ---"
REG_BODY=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-phase2@test.com","password":"test1234","name":"Phase2 Tester"}')
REG_TOKEN=$(echo "$REG_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -n "$REG_TOKEN" ] && [ "$REG_TOKEN" != "" ]; then
  pass "Register teacher (token received)"
else
  # Already registered — try login instead
  REG_CODE=$(echo "$REG_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',''))" 2>/dev/null)
  if echo "$REG_CODE" | grep -qi "이미\|exist\|duplicate"; then
    pass "Register teacher (already exists, OK)"
  else
    fail "Register teacher" "$REG_BODY"
  fi
fi

echo ""
echo "--- Test 2: Login teacher ---"
LOGIN_BODY=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-phase2@test.com","password":"test1234"}')
TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
  pass "Login teacher (token received)"
else
  fail "Login teacher" "$LOGIN_BODY"
  echo "  FATAL: Cannot continue without token"
  exit 1
fi

echo ""
echo "--- Test 3: Get current teacher (GET /auth/me) ---"
ME_BODY=$(curl -s "$BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN")
ME_EMAIL=$(echo "$ME_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['teacher']['email'])" 2>/dev/null)

if [ "$ME_EMAIL" = "test-phase2@test.com" ]; then
  pass "Get current teacher (email=$ME_EMAIL)"
else
  fail "Get current teacher" "email=$ME_EMAIL, body=$ME_BODY"
fi

# ============ Session Tests ============

echo ""
echo "--- Test 4: Create session ---"
CREATE_BODY=$(curl -s -X POST "$BASE/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Phase2 Test Session","topicCount":3,"topicDuration":180}')
SESSION_ID=$(echo "$CREATE_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['id'])" 2>/dev/null)

if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "" ]; then
  pass "Create session (id=$SESSION_ID)"
else
  fail "Create session" "$CREATE_BODY"
fi

echo ""
echo "--- Test 5: Activate session ---"
ACT_BODY=$(curl -s -X PATCH "$BASE/sessions/$SESSION_ID/activate" \
  -H "Authorization: Bearer $TOKEN")
ACCESS_CODE=$(echo "$ACT_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['access_code'])" 2>/dev/null)

if [ -n "$ACCESS_CODE" ] && [ "$ACCESS_CODE" != "" ]; then
  pass "Activate session (access_code=$ACCESS_CODE)"
else
  fail "Activate session" "$ACT_BODY"
fi

echo ""
echo "--- Test 6: Join session by access code ---"
JOIN_BODY=$(curl -s "$BASE/sessions/join/$ACCESS_CODE")
JOIN_TITLE=$(echo "$JOIN_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['title'])" 2>/dev/null)

if [ "$JOIN_TITLE" = "Phase2 Test Session" ]; then
  pass "Join session by code (title=$JOIN_TITLE)"
else
  fail "Join session by code" "title=$JOIN_TITLE, body=$JOIN_BODY"
fi

echo ""
echo "--- Test 7: Close session ---"
CLOSE_BODY=$(curl -s -X PATCH "$BASE/sessions/$SESSION_ID/close" \
  -H "Authorization: Bearer $TOKEN")
CLOSE_STATUS=$(echo "$CLOSE_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['session']['status'])" 2>/dev/null)

if [ "$CLOSE_STATUS" = "closed" ]; then
  pass "Close session (status=$CLOSE_STATUS)"
else
  fail "Close session" "status=$CLOSE_STATUS, body=$CLOSE_BODY"
fi

# ============ Summary ============
echo ""
echo "================================="
echo "Results: $PASS passed, $FAIL failed (total $((PASS+FAIL)))"
echo "================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
