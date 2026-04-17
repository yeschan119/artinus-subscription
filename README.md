Overview

구독 서비스 백엔드 API 과제 구현 프로젝트입니다.
회원의 구독/해지 상태를 관리하고, 외부 API 장애 상황을 고려한 트랜잭션 처리, LLM 기반 이력 요약, 로컬 즉시 실행 가능한 테스트 환경을 목표로 설계했습니다.

<details>
<summary><strong>Quick Start - Code를 다운 받은 후 실행 절차</strong></summary>
npm install
npm run dev

Server URL:

http://localhost:3000
</details>
<details>
<summary><strong>Requirements Mapping</strong></summary>

* 구독 / 해지 API 제공
* 상태 전이 규칙 검증
* 채널별 허용 기능 검증
* 외부 API 결과에 따른 commit / rollback
* 장애 대응 로직 (retry / timeout / backoff)
* 회원 조회 + 구독 이력 제공
* LLM 기반 이력 자연어 요약

</details>
<details>
<summary><strong>Test</strong></summary>

Health Check

curl -s http://localhost:3000/health

BASIC 가입

curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"BASIC"}'

회원 조회

curl -s http://localhost:3000/api/v1/subscriptions/members/01012345678

PREMIUM 업그레이드

curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"PREMIUM"}'

PREMIUM → BASIC 다운그레이드

curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"BASIC"}'

BASIC → NONE 해지

curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"NONE"}'
</details>
<details>
<summary><strong>Tech Stack / 선택 이유</strong></summary>

Category	Choice
Runtime	Node.js
Language	TypeScript
Framework	Express
Validation	Zod
Error Handling	http-errors
LLM	OpenAI API (Separate Render Service)
Dev Runner	tsx
Deployment	Render

Node.js

외부 API 호출, HTTP 요청 처리, JSON 응답 중심 구조에서 높은 생산성을 제공합니다.

TypeScript

도메인 규칙과 상태값을 타입 수준에서 안전하게 관리할 수 있습니다.

Express

간결한 구조로 REST API 구현에 적합합니다.

Zod

런타임 입력 검증 + 타입 안정성을 동시에 제공합니다.

Separate LLM Service

메인 프로젝트는 API Key 없이 실행 가능하도록 분리했습니다.

</details>
<details>
<summary><strong>Project Structure</strong></summary>
subscription-service/
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts
    ├── app.ts
    ├── constants/
    ├── data/
    ├── services/
    ├── routes/
    ├── validators/
    ├── middlewares/
    └── llm/
</details>
<details>
<summary><strong>Domain Design</strong></summary>

Subscription Status

Status	Meaning
NONE	구독 안함
BASIC	일반 구독
PREMIUM	프리미엄 구독

Channel Type

Type	Subscribe	Unsubscribe
BOTH	O	O
SUBSCRIBE_ONLY	O	X
UNSUBSCRIBE_ONLY	X	O

</details>
<details>
<summary><strong>State Transition Rules</strong></summary>

Subscribe

Current	Allowed
NONE	BASIC, PREMIUM
BASIC	PREMIUM
PREMIUM	-

Unsubscribe

Current	Allowed
PREMIUM	BASIC, NONE
BASIC	NONE
NONE	-

SUBSCRIBE_TRANSITIONS[current].includes(targetStatus)
UNSUBSCRIBE_TRANSITIONS[current].includes(targetStatus)
</details>
<details>
<summary><strong>Architecture Decisions</strong></summary>

In-Memory Storage

* DB 없이 즉시 실행 가능
* 추후 RDBMS 전환 용이

Global Error Middleware

* 응답 포맷 통일
* 유지보수 용이

External API Failure Handling

* Retry (3회)
* Backoff Delay
* Timeout

LLM Warm-up

개발 서버 시작 시 LLM 서버를 선호출하여 cold start 지연을 완화했습니다.

</details>
<details>
<summary><strong>Future Improvements</strong></summary>

* Replace memory store with RDBMS
* Add unit / integration tests
* Add request logging / metrics
* Add circuit breaker for external API
* Cache LLM summaries
* Dockerize deployment
* CI/CD pipeline

</details>
