## Overview

+ 구독 서비스 백엔드 API 과제 구현 프로젝트입니다.
+ 회원의 구독/해지 상태를 관리하고, 외부 API 장애 상황을 고려한 트랜잭션 처리, LLM 기반 이력 요약, 로컬 즉시 실행 가능한 테스트 환경을 목표로 설계했습니다.
````bash
Artinus Subscription Service (Node.js + TypeScript)
Quick Start - Code를 다운 받은 후 실행 절차
npm install
npm run dev
````

Server URL:

```text
http://localhost:3000
```
---

<details>
<summary><strong>Test Examples</strong></summary>

+ health check
```bash
curl -s http://localhost:3000/health
```
+ BASIC 가입
```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"BASIC"}'
```
+ 회원 조회
```bash
curl -s http://localhost:3000/api/v1/subscriptions/members/01012345678
```
+ PREMIUM 업그레이드
```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"PREMIUM"}'
```
+ PREMIUM -> BASIC 다운그레이드
```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"BASIC"}'
```
+ BASIC -> NONE 해지
```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":1,"targetStatus":"NONE"}'
```
+ 잘못된 해지 채널
```bash
curl -s -X POST http://localhost:3000/api/v1/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"01012345678","channelId":3,"targetStatus":"NONE"}'
```
+ 잘못된 상태 변경 (subscribe로 NONE 요청)
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

# Tech 설명

## 1. Framework(Node.js + Express)
간결한 구조로 REST API를 빠르게 구성할 수 있어 과제 목적에 적합합니다.
라우팅, 미들웨어, 에러 핸들링 구조가 명확합니다.

## 2. TypeScript

도메인 규칙(상태 전이, 채널 타입, DTO 검증)을 명확하게 표현하기 위해 선택했습니다.
런타임 오류보다 컴파일 단계에서 잘못된 상태값/타입을 사전에 차단할 수 있습니다.

## 3. Zod

입력값 검증을 코드와 타입 시스템에 동시에 연결하기 위해 사용했습니다.
잘못된 phoneNumber / channelId / targetStatus 요청을 초기에 차단합니다.

## 4. Separate LLM Service

메인 서버에서 OpenAI Key 의존성을 제거하기 위해 LLM 기능을 별도 서버로 분리했습니다.
Git clone 후 `.env` 없이도 메인 서버 실행이 가능합니다.

---

# Project Structure

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

---

# Domain Design

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

---

# State Transition Rules

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

---

# Data Layer Design

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

---

# API Design

## Subscribe

`POST /api/v1/subscriptions/subscribe`

```json
{
  "phoneNumber": "01012345678",
  "channelId": 1,
  "targetStatus": "BASIC"
}
```

## Unsubscribe

`POST /api/v1/subscriptions/unsubscribe`

## Get Member

`GET /api/v1/subscriptions/members/:phoneNumber`

---

# Validation Strategy

요청 진입 시점에 Zod로 검증합니다.

* phoneNumber required
* channelId number
* targetStatus enum only

잘못된 요청은 비즈니스 로직까지 진입하지 않습니다.

---

# Error Handling

전역 에러 미들웨어를 적용했습니다.

```json
{
  "success": false,
  "message": "회원 없음"
}
```

## Why?

* 응답 포맷 일관성 유지
* 유지보수 용이
* 라우터 코드 단순화

---

# External API Failure Handling

과제 요구사항의 commit / rollback 조건을 구현하기 위해 외부 API 호출을 모의했습니다.

## Base Logic

* 성공 시 commit
* 실패 시 rollback

## Improved Resilience

즉시 실패 대신 장애 대응 로직을 추가했습니다.

### Retry

최대 3회 재시도

### Backoff Delay

재시도 간 점진적 대기

### Timeout

응답 지연 시 timeout 처리

## Why Needed?

실제 외부 API 실패는 일시 장애일 수 있기 때문입니다.

예:
* network jitter
* temporary overload
* timeout
* transient failure

즉시 실패보다 재시도가 현실적입니다.

---

# LLM Integration

회원 조회 시 구독 변경 이력을 자연어로 요약합니다.

예:
* 채널 1에서 BASIC 가입
* 채널 2에서 PREMIUM 업그레이드
* 현재 상태는 PREMIUM

## Architecture

### Main Server

* no API key required
* subscription domain logic 수행

### LLM Server (Render)

* OpenAI API Key 보관
* `/histories` endpoint 제공
* 요약 응답 반환

## Warm-up Logic

개발 서버 시작 시 LLM 서버를 선호출하여 cold start 지연을 완화했습니다.

---

# Performance / Maintainability Considerations

## Layer Separation

* routes: HTTP layer
* services: business logic
* data: storage
* constants: rules
* middleware: cross-cutting concerns
* llm: external integration layer

## Easy Migration

In-memory → DB 교체 용이

## Readability

상태 전이 규칙과 도메인 enum 분리

---

# Cloud Architecture

<details>
<summary><strong>제안 아키텍처</strong></summary>
```text
Client / Tester
   │
   ▼
Route 53
   │
   ▼
Application Load Balancer (ALB)
   │
   ▼
ECS Fargate Service (subscription-service, multi-task)
   │
   ├── Amazon RDS (MySQL/PostgreSQL)
   │      ├── members
   │      ├── channels
   │      └── subscription_histories
   │
   ├── AWS Secrets Manager
   │      ├── DB credentials
   │      └── external API secrets
   │
   ├── CloudWatch
   │      ├── logs
   │      ├── metrics
   │      └── alarms
   │
   ├── Optional: ElastiCache Redis
   │      ├── hot read cache
   │      └── LLM summary cache
   │
   └── External LLM Service
          └── Render Web Service
                 └── OpenAI API
  ```

이 구조는 메인 API와 LLM 의존성을 분리합니다.
메인 서비스는 AWS에서 운영하고, LLM 요약은 별도 서비스(Render)에 위임해 OpenAI 키를 메인 서버에서 분리합니다.

</details>

⸻

<details>
<summary><strong>3. 구성 요소별 설계</strong></summary>

3.1 Route 53 + ALB

외부 트래픽은 Route 53을 통해 도메인으로 유입시키고, ALB가 ECS Task들로 분산합니다.

* Target Group 기반 라우팅
* Health Check 통과 Task만 트래픽 수신
* 무중단 배포 지원
* HTTPS(TLS 인증서) 적용 가능

⸻

3.2 ECS Fargate

메인 subscription-service는 ECS Fargate로 운영하는 것이 적합합니다.

이유

* EC2 서버 관리 불필요
* 컨테이너 단위 배포
* Auto Scaling 지원
* 운영 비용 최적화

확장 전략

* CPU 70% 이상 → Task 증가
* 요청량 급증 시 Step Scaling
* 트래픽 예측 기반 Predictive Scaling

⸻

3.3 Amazon RDS

현재 In-Memory 저장소는 프로세스 재시작 시 데이터가 유실되므로 운영 환경에서는 RDS로 전환해야 합니다.

적합한 이유

* 구독 상태 전이 관리
* 이력 저장
* 트랜잭션 처리
* 정합성 보장

권장 옵션

* Multi-AZ 구성
* Read Replica
* Automated Backup
* Point-in-time Recovery

⸻

3.4 Secrets Manager

DB 비밀번호, 외부 API Key 같은 민감 정보는 .env가 아니라 Secrets Manager에 저장합니다.

장점

* 코드 저장소 유출 방지
* 키 회전(Rotation)
* IAM 권한 제어
* ECS 환경변수 주입 가능

⸻

3.5 External LLM Service

현재 구조처럼 LLM 요약 기능은 별도 서비스로 분리합니다.

Main API -> HTTP Call -> history-llm -> OpenAI API

장점

* 메인 서버에 OpenAI Key 불필요
* LLM 장애와 API 장애 분리
* 독립 배포 가능
* 다른 모델로 교체 쉬움
* 요청량에 따라 별도 스케일링 가능

</details>

⸻

<details>
<summary><strong>4. 데이터 모델 설계</strong></summary>

members

컬럼	설명
member_id	PK
phone_number	회원 식별
subscription_status	현재 상태
created_at	생성일
updated_at	수정일

⸻

channels

컬럼	설명
channel_id	PK
channel_type	가입/해지 가능 여부
name	채널명
created_at	생성일
updated_at	수정일

⸻

subscription_histories

컬럼	설명
history_id	PK
phone_number	회원
channel_id	요청 채널
action	subscribe / unsubscribe
from_status	이전 상태
to_status	변경 상태
created_at	생성일

</details>

---
