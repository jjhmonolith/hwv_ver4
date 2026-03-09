import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:4010/api";
const UNIQUE = Date.now().toString(36);
const TEST_EMAIL = `e2e-${UNIQUE}@test.com`;
const TEST_PASSWORD = "test1234";
const TEST_NAME = "E2E Tester";

// Helper: register teacher via API
async function registerTeacher() {
  await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    }),
  });
}

// Helper: login via API and get token
async function getToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const data = await res.json();
  return data.token;
}

// Helper: create session via API
async function createSessionAPI(token: string, title: string) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });
  const data = await res.json();
  return data.session;
}

// Helper: activate session via API
async function activateSessionAPI(sessionId: string, token: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/activate`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.session;
}

// Helper: save result via API
async function saveResultAPI(sessionId: string) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentName: "테스트학생",
      studentId: "2024999",
      interviewMode: "chat",
      topicsData: {
        extractedText: "테스트 과제",
        topics: [
          {
            id: "t1",
            title: "주제1",
            timeUsed: 60,
            timeLimit: 120,
            conversations: [
              { role: "ai", text: "테스트 질문입니다" },
              { role: "student", text: "테스트 답변입니다" },
            ],
          },
        ],
      },
      summary: {
        strengths: ["이해도가 좋습니다"],
        weaknesses: ["보충이 필요합니다"],
        overallComment: "전반적으로 양호합니다",
      },
      startedAt: new Date().toISOString(),
    }),
  });
  return res.json();
}

// Helper: login via page and set token in localStorage
async function loginViaLocalStorage(
  page: import("@playwright/test").Page,
  token: string
) {
  await page.goto("/teacher/login");
  await page.evaluate((t: string) => {
    localStorage.setItem("teacherToken", t);
  }, token);
}

// ============ Setup ============
test.beforeAll(async () => {
  await registerTeacher();
});

// ============ Phase 1+2 Tests ============

test.describe("Home Page", () => {
  test("should show main page with navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("HW Validator")).toBeVisible();
    await expect(page.getByText("인터뷰 시작")).toBeVisible();
    await expect(page.getByText("세션 참가")).toBeVisible();
    await expect(page.getByText("교사 로그인")).toBeVisible();
  });
});

test.describe("Teacher Auth", () => {
  test("should navigate to login page", async ({ page }) => {
    await page.goto("/teacher/login");
    await expect(page.getByText("교사 로그인")).toBeVisible();
    await expect(page.getByPlaceholder("teacher@school.edu")).toBeVisible();
  });

  test("should register a new teacher", async ({ page }) => {
    const regEmail = `e2e-reg-${UNIQUE}@test.com`;

    await page.goto("/teacher/login");
    await page.getByText("계정이 없으신가요? 회원가입").click();
    await expect(page.getByText("교사 회원가입")).toBeVisible();

    await page.getByPlaceholder("이름을 입력하세요").fill("Reg Tester");
    await page.getByPlaceholder("teacher@school.edu").fill(regEmail);
    await page.getByPlaceholder("6자 이상").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "회원가입" }).click();

    // window.location.href redirect - wait for URL change
    await page.waitForURL("**/teacher**", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "대시보드" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("should login with existing teacher", async ({ page }) => {
    await page.goto("/teacher/login");

    await page.getByPlaceholder("teacher@school.edu").fill(TEST_EMAIL);
    await page.getByPlaceholder("6자 이상").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "로그인" }).click();

    await page.waitForURL("**/teacher**", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "대시보드" })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Teacher Dashboard", () => {
  test("should show dashboard with stats", async ({ page }) => {
    const token = await getToken();
    await loginViaLocalStorage(page, token);
    await page.goto("/teacher");

    await expect(
      page.getByRole("heading", { name: "대시보드" })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("새 세션 만들기")).toBeVisible();
  });
});

test.describe("Session Management", () => {
  test("should create a new session", async ({ page }) => {
    const token = await getToken();
    await loginViaLocalStorage(page, token);

    await page.goto("/teacher/sessions/new");
    await expect(
      page.getByRole("heading", { name: "새 세션 만들기" })
    ).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder("예: 2학년 1반 과제 인터뷰").fill(`E2E 세션 ${UNIQUE}`);
    await page.getByRole("button", { name: "세션 만들기" }).click();

    await page.waitForURL("**/teacher/sessions/*", { timeout: 10000 });
    await expect(page.getByText(`E2E 세션 ${UNIQUE}`)).toBeVisible();
    await expect(page.getByText("준비 중")).toBeVisible();
  });

  test("should activate and close a session", async ({ page }) => {
    const token = await getToken();
    const session = await createSessionAPI(token, `Activate ${UNIQUE}`);

    await loginViaLocalStorage(page, token);
    await page.goto(`/teacher/sessions/${session.id}`);

    await expect(page.getByText("준비 중")).toBeVisible({ timeout: 5000 });

    // Activate
    await page.getByRole("button", { name: "세션 활성화" }).click();
    await expect(page.getByText("활성", { exact: true })).toBeVisible({ timeout: 5000 });

    // Close
    await page.getByRole("button", { name: "세션 종료" }).click();
    await expect(page.getByText("종료됨", { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Student Join", () => {
  test("should show join page", async ({ page }) => {
    await page.goto("/join");
    await expect(
      page.getByRole("heading", { name: "세션 참가" })
    ).toBeVisible();
  });

  test("should show error for invalid code", async ({ page }) => {
    await page.goto("/join/XXXXXX");
    await expect(page.getByText("세션을 찾을 수 없")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should join session with valid access code", async ({ page }) => {
    const token = await getToken();
    const session = await createSessionAPI(token, `Join ${UNIQUE}`);
    const activated = await activateSessionAPI(session.id, token);

    await page.goto(`/join/${activated.access_code}`);
    await expect(page.getByText(`Join ${UNIQUE}`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("인터뷰 시작하기")).toBeVisible();
  });
});

test.describe("Interview Page", () => {
  test("should show upload card", async ({ page }) => {
    await page.goto("/interview");
    await expect(page.getByText("과제 PDF 업로드")).toBeVisible();
    await expect(page.getByTestId("submit-button")).toBeVisible();
  });

  test("should show student info form when session config exists", async ({
    page,
  }) => {
    await page.goto("/interview");
    await page.evaluate(() => {
      localStorage.setItem(
        "sessionConfig",
        JSON.stringify({
          sessionId: "test-id",
          topicCount: 2,
          topicDuration: 120,
          interviewMode: "chat",
          sessionTitle: "테스트 세션",
        })
      );
    });
    await page.reload();

    await expect(page.getByText("테스트 세션")).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder("이름을 입력하세요")).toBeVisible();
  });
});

test.describe("Logout", () => {
  test("should logout successfully", async ({ page }) => {
    const token = await getToken();
    await loginViaLocalStorage(page, token);
    await page.goto("/teacher");

    await expect(
      page.getByRole("heading", { name: "대시보드" })
    ).toBeVisible({ timeout: 5000 });

    await page.getByText("로그아웃").click();

    await expect(page.getByText("교사 로그인")).toBeVisible({ timeout: 5000 });
  });
});

// ============ Phase 3 Tests ============

test.describe("Results Viewing (Phase 3)", () => {
  let token: string;
  let sessionId: string;
  let resultId: string;

  test.beforeAll(async () => {
    token = await getToken();
    const session = await createSessionAPI(token, `Results ${UNIQUE}`);
    sessionId = session.id;
    await activateSessionAPI(sessionId, token);
    const result = await saveResultAPI(sessionId);
    resultId = result.resultId;
  });

  test("should show results in session detail page", async ({ page }) => {
    await loginViaLocalStorage(page, token);
    await page.goto(`/teacher/sessions/${sessionId}`);

    await expect(page.getByText("인터뷰 결과 (1건)")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("테스트학생")).toBeVisible();
    await expect(page.getByText("2024999")).toBeVisible();
  });

  test("should navigate to result detail page", async ({ page }) => {
    await loginViaLocalStorage(page, token);
    await page.goto(`/teacher/sessions/${sessionId}`);

    await page.getByText("테스트학생").click();

    await expect(
      page.getByText("테스트학생님의 인터뷰 결과")
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("이해도가 좋습니다")).toBeVisible();
    await expect(page.getByText("보충이 필요합니다")).toBeVisible();
    await expect(page.getByText("전반적으로 양호합니다")).toBeVisible();
  });

  test("should show conversation in result detail", async ({ page }) => {
    await loginViaLocalStorage(page, token);
    await page.goto(
      `/teacher/sessions/${sessionId}/results/${resultId}`
    );

    await expect(page.getByRole("heading", { name: "주제1" })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("테스트 질문입니다")).toBeVisible();
    await expect(page.getByText("테스트 답변입니다")).toBeVisible();
  });
});
