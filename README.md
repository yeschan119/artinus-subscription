## Overview

구독 서비스 백엔드 API 과제 구현 프로젝트입니다.
회원의 구독/해지 상태를 관리하고, 외부 API 장애 상황을 고려한 트랜잭션 처리, LLM 기반 이력 요약, 로컬 즉시 실행 가능한 테스트 환경을 목표로 설계했습니다.

<details>
<summary><strong># Artinus Subscription Service (Node.js + TypeScript)</strong></summary>

## Quick Start - Code를 다운 받은 후 실행 절차

npm install
npm run dev

Server URL:

```text
http://localhost:3000
```

---

</details>

<details>
<summary><strong># Test Examples</strong></summary>

* health check

```bash
curl -s http://localhost:3000/health
```

* BASIC 가입

```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"BASIC"}'
```

* 회원 조회

```bash
curl -s http://localhost:3000/api/v1/subscriptions/members/01012345678
```

* PREMIUM 업그레이드

```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"PREMIUM"}'
```

* PREMIUM -> BASIC 다운그레이드

```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"BASIC"}'
```

* BASIC -> NONE 해지

```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"NONE"}'
```

* 잘못된 해지 채널

```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":3,"targetStatus":"NONE"}'
```

* 잘못된 상태 변경 (subscribe로 NONE 요청)

```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"NONE"}'
```

</details>

## Requirements Mapping

* 구독 / 해지 API 제공
* 상태 전이 규칙 검증
* 채널별 허용 기능 검증
* 외부 API 결과에 따른 commit / rollback
* 장애 대응 로직 (retry / timeout / backoff)
* 회원 조회 + 구독 이력 제공
* LLM 기반 이력 자연어 요약

---

## Tech Stack

| Category       | Choice                               |
| -------------- | ------------------------------------ |
| Runtime        | Node.js                              |
| Language       | TypeScript                           |
| Framework      | Express                              |
| Validation     | Zod                                  |
| Error Handling | http-errors                          |
| LLM            | OpenAI API (Separate Render Service) |
| Dev Runner     | tsx                                  |
| Deployment     | Render                               |

---

<details>
<summary><strong># Tech 설명</strong></summary>

## 1. Node.js

.NET / FastAPI 대비 Node.js 경험이 부족하여 일부러 Node.js로 구현하면서 경험을 쌓고 있습니다.
특히 외부 API 호출, HTTP 요청 처리, JSON 응답 중심 구조에서 높은 생산성을 제공합니다.

## 2. TypeScript

도메인 규칙(상태 전이, 채널 타입, DTO 검증)을 명확하게 표현하기 위해 선택했습니다.
런타임 오류보다 컴파일 단계에서 잘못된 상태값/타입을 사전에 차단할 수 있습니다.

## 3. Express

간결한 구조로 REST API를 빠르게 구성할 수 있어 과제 목적에 적합합니다.
라우팅, 미들웨어, 에러 핸들링 구조가 명확합니다.

## 4. Zod

입력값 검증을 코드와 타입 시스템에 동시에 연결하기 위해 사용했습니다.
잘못된 phoneNumber / channelId / targetStatus 요청을 초기에 차단합니다.

## 5. Separate LLM Service

메인 서버에서 OpenAI Key 의존성을 제거하기 위해 LLM 기능을 별도 서버로 분리했습니다.
Git clone 후 `.env` 없이도 메인 서버 실행이 가능합니다.

</details>

<details>
<summary><strong># Project Structure</strong></summary>

```text
subscription-service/
│
├── package.json
├── tsconfig.json
├── .env
└── src/
    ├── server.ts                # Entry Point
    ├── app.ts                   # Express App Config
    │
    ├── constants/
    │   └── subscription.ts      # Enum / Transition Rules
    │
    ├── data/
    │   └── memory.ts            # In-Memory Storage
    │
    ├── services/
    │   ├── csrng.service.ts     # External API Mock
    │   └── subscription.service.ts
    │
    ├── routes/
    │   └── subscription.routes.ts
    │
    ├── validators/
    │   └── subscription.validator.ts
    │
    ├── middlewares/
    │   └── error.middleware.ts
    │
    └── llm/
        └── history-llm.ts       # External LLM Connector
```

</details>

<details>
<summary><strong># Domain Design</strong></summary>

## Subscription Status

| Status  | Meaning |
| ------- | ------- |
| NONE    | 구독 안함   |
| BASIC   | 일반 구독   |
| PREMIUM | 프리미엄 구독 |

## Channel Type

| Type             | Subscribe | Unsubscribe |
| ---------------- | --------- | ----------- |
| BOTH             | O         | O           |
| SUBSCRIBE_ONLY   | O         | X           |
| UNSUBSCRIBE_ONLY | X         | O           |

</details>

<details>
<summary><strong># State Transition Rules</strong></summary>

## Subscribe

| Current | Allowed        |
| ------- | -------------- |
| NONE    | BASIC, PREMIUM |
| BASIC   | PREMIUM        |
| PREMIUM | -              |

## Unsubscribe

| Current | Allowed     |
| ------- | ----------- |
| PREMIUM | BASIC, NONE |
| BASIC   | NONE        |
| NONE    | -           |

구현은 if-else 분기 대신 상태 전이 테이블로 처리했습니다.

```ts
SUBSCRIBE_TRANSITIONS[current].includes(targetStatus)
UNSUBSCRIBE_TRANSITIONS[current].includes(targetStatus)
```

## Why Transition Table?

* 규칙이 명확함
* 신규 등급 추가 시 확장 용이
* 테스트 쉬움
* 비즈니스 로직 단순화

</details>

<details>
<summary><strong># Data Layer Design</strong></summary>

## Why In-Memory?

즉시 실행 가능한 구조를 우선으로 작업했습니다.
별도 DB 세팅 없이 아래 명령어만으로 실행 가능합니다.

```bash
npm install
npm run dev
```

## Stored Data

* members
* channels
* histories

향후 MySQL / PostgreSQL / Prisma로 교체 가능하도록 서비스 계층과 분리했습니다.

</details>

<details>
<summary><strong># API Design</strong></summary>

## Subscribe

`POST /api/v1/subscriptions/subscribe`

## Unsubscribe

`POST /api/v1/subscriptions/unsubscribe`

## Get Member

`GET /api/v1/subscriptions/members/:phoneNumber`

</details>

<details>
<summary><strong># Validation Strategy</strong></summary>

요청 진입 시점에 Zod로 검증합니다.

* phoneNumber required
* channelId number
* targetStatus enum only

</details>

<details>
<summary><strong># Error Handling</strong></summary>

전역 에러 미들웨어를 적용했습니다.

</details>

<details>
<summary><strong># External API Failure Handling</strong></summary>

Retry / Backoff / Timeout 적용.

</details>

<details>
<summary><strong># LLM Integration</strong></summary>

별도 Render 서버를 통한 이력 요약 기능 구현.

</details>

<details>
<summary><strong># Performance / Maintainability Considerations</strong></summary>

Layer Separation / Easy Migration / Readability

</details>

<details>
<summary><strong># Future Improvements</strong></summary>

* Replace memory store with RDBMS
* Add unit / integration tests
* Add request logging / metrics
* Add circuit breaker for external API
* Cache LLM summaries
* Dockerize deployment
* CI/CD pipeline

</details>
