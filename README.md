# DemoAI Platform

> Internal AI + QA Workshop Demo — Synthetic project for demonstrating Claude AI agents in enterprise QA/TestOps workflows.

## Repository Structure

```
demoai-platform/
├── backend/
│   ├── order-service/       # Node.js — order lifecycle, cart, guest checkout
│   ├── payment-service/     # Java — payments, retry logic, refunds (ADO #31–33, #46, #50, #54)
│   ├── courier-service/     # Go — real-time tracking, ETA, availability (ADO #29, #30, #44)
│   ├── notification-service/# Python — push, SMS failover, preferences (ADO #35–37, #47, #53)
│   └── promo-service/       # Node.js — promo codes, referral, seasonal (ADO #34, #41, #42)
├── mobile/
│   ├── ios/                 # Swift — cart persistence, checkout, tracking (ADO #26–29)
│   └── android/             # Kotlin — matching iOS feature set
├── tests/
│   ├── e2e/                 # Playwright end-to-end test suites
│   └── integration/         # API contract and service integration tests
├── ai-agents/
│   ├── bug-triage/          # AI Bug Triage Agent (ADO #39, #23)
│   ├── test-case-gen/       # AI Test Case Generation Agent (ADO #38, #22)
│   ├── risk-analysis/       # Risk-Based Regression Agent (ADO #40, #24)
│   ├── release-summary/     # AI Release Summary Agent (ADO #43, #25)
│   └── defect-clustering/   # Defect Clustering Agent
├── scripts/                 # Dev setup, test runners, deploy helpers
├── prompts/                 # LLM prompt templates for AI agents
└── .github/workflows/       # CI/CD pipelines
```

## ADO Project

**Azure DevOps**: [DemoAIGeorgia](https://dev.azure.com/DemoAIGeorgia/DemoAIGeorgia)

## Services Overview

| Service | Language | ADO Area | Key Tickets |
|---|---|---|---|
| order-service | Node.js | Mobile/Backend | #26, #27, #28, #34 |
| payment-service | Java | Payments | #31, #32, #33, #46, #50, #51, #54 |
| courier-service | Go | Backend | #29, #30, #44, #49, #52 |
| notification-service | Python | Notifications | #35, #36, #37, #47, #53 |
| promo-service | Node.js | Backend | #34, #41, #42, #50, #55 |

## AI Agents

| Agent | ADO Epic | Status |
|---|---|---|
| Bug Triage Agent | QA Automation Modernization (#6) | In Development |
| Test Case Generation Agent | QA Automation Modernization (#6) | In Development |
| Risk Analysis Agent | QA Automation Modernization (#6) | In Development |
| Release Summary Agent | QA Automation Modernization (#6) | In Development |
| Defect Clustering Agent | QA Automation Modernization (#6) | Planned |

## Quick Start

```bash
# Install dependencies
./scripts/setup-dev.sh

# Run all unit tests
./scripts/run-tests.sh

# Run AI agents locally
cd ai-agents && pip install -r requirements.txt
python bug-triage/agent.py --work-item-id 46
```
