# Cloud Architecture
## Diagram
```
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
이 구조는 메인 API와 LLM 의존성을 분리합니다. 메인 서비스는 AWS에서 운영하고, LLM 요약은 별도 서비스(Render)에 위임해 OpenAI 키를 메인 서버에서 분리합니다.

⸻

## 구성 요소별 설계

+ Route 53 + ALB

외부 트래픽은 Route 53을 통해 도메인으로 유입시키고, ALB가 ECS task들로 분산합니다. ALB는 target group health check를 통해 정상 task로만 요청을 전달합니다. ECS 배포 속도는 ALB health check 설정에 영향을 받고, AWS는 health check interval과 healthy threshold를 조정해 등록 시간을 줄일 수 있다고 안내합니다.  ￼

+ ECS Fargate

메인 subscription-service는 ECS Fargate로 운영하는 것이 적합합니다. 이유는 서버 관리 부담이 적고, Node.js API를 컨테이너 단위로 간단히 배포할 수 있으며, 서비스 오토스케일링도 지원하기 때문입니다. ECS 서비스는 target tracking, step scaling, scheduled actions, predictive scaling 등을 통해 task 수를 자동 조절할 수 있습니다.  ￼

+ Amazon RDS

현재 in-memory 저장소는 프로세스 재시작 시 데이터가 유실되므로 운영 환경에서는 RDS로 전환해야 합니다. 이 서비스는 상태 전이, 이력 관리, 트랜잭션이 핵심이므로 관계형 DB가 적합합니다. 고가용성을 위해 RDS Multi-AZ를 적용하는 것이 바람직하며, AWS 문서 기준으로 Multi-AZ는 다른 AZ에 standby를 두고 자동 failover를 지원합니다. Multi-AZ DB cluster는 읽기 트래픽도 처리할 수 있는 구조를 제공합니다.  ￼

+ Secrets Manager

DB 비밀번호, 외부 API 키 같은 민감 정보는 코드나 .env 파일이 아니라 Secrets Manager에 저장합니다. ECS는 task definition에서 Secrets Manager 비밀값을 환경변수로 주입할 수 있습니다. AWS 문서는 ECS에서 Secrets Manager 값을 전체 또는 특정 JSON key 기준으로 주입할 수 있다고 설명합니다.  ￼

+ External LLM Service

현재 구조처럼 LLM 요약 기능은 별도 서비스로 분리합니다. 메인 서비스는 history-llm을 HTTP로 호출하고, LLM 서비스만 OpenAI API 키를 보유합니다. 이 구조의 장점은 다음과 같습니다.

* 메인 API 서버에 OpenAI 키를 둘 필요가 없음
* LLM 장애가 메인 API 배포/스케일 전략과 분리됨
* 나중에 다른 모델 또는 다른 요약 서비스로 교체하기 쉬움

⸻

## 데이터 모델 설계

운영 환경에서는 최소 아래 테이블을 둡니다.

members

* member_id
* phone_number
* subscription_status
* created_at
* updated_at

channels

* channel_id
* channel_type
* name
* created_at
* updated_at

subscription_histories

* history_id
* phone_number
* channel_id
* action
* from_status
* to_status
* created_at
