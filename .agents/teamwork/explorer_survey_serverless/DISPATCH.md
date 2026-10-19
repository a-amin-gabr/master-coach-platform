# Dispatch: Serverless & Cloud Infrastructure Survey

## Identity
- Role: Cloud Serverless Architecture Explorer
- Type: teamwork_preview_explorer
- Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless
- Parent Orchestrator Working Directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/orchestrator

## Mandatory Reading
Read the authoritative user request at:
`/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md`

## Mission
Conduct a comprehensive, read-only survey of the serverless architecture, AWS Always-Free constraints, and IaC requirements for `zamalat.cyce52.com`.

Analyze:
1. Current server implementation and how it can be adapted into AWS Lambda Node.js handlers and API Gateway (HTTP & WebSocket).
2. DynamoDB Single-Table Design requirements: entities (users, tasks, evidence, tool applications, rubrics evaluations, chat messages, websocket connection-state), partition keys (PK), sort keys (SK), GSIs, strictly configured for 25 RCU / 25 WCU provisioned capacity and under 25GB storage.
3. S3 pre-signed upload URLs and storage lifecycle for candidate evidence/recordings.
4. WebSocket real-time messaging architecture with Lambda + DynamoDB connection management.
5. CloudFront static distribution with security headers (CSP, HSTS, X-Frame-Options) for `zamalat.cyce52.com`.
6. IaC templates (CloudFormation / SAM / Terraform) and local emulation options (DynamoDB local, SAM local).

Output:
Write a comprehensive report to `/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless/serverless_survey_report.md` and `handoff.md`.
Then notify orchestrator.

## 2026-10-16T04:59:41Z
You are the Cloud Serverless Architecture Explorer for the Master Coach Fellowship Platform project.
Your assigned working directory is:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/explorer_survey_serverless

Read your DISPATCH.md in your working directory and the authoritative user request at:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform/.agents/teamwork/ORIGINAL_REQUEST.md

Your mission is to perform a comprehensive, read-only survey of the serverless architecture, AWS Always-Free constraints, and IaC requirements for `zamalat.cyce52.com` at:
/home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform

Analyze:
1. Current server APIs and adaptation into AWS Lambda Node.js handlers and API Gateway (HTTP & WebSocket).
2. DynamoDB Single-Table Design schema: entities (users, tasks, evidence, tool applications, rubrics evaluations, chat messages, websocket connection-state), PK/SK design, GSIs, strictly configured for 25 RCU / 25 WCU provisioned capacity and under 25GB storage.
3. S3 pre-signed upload URLs and storage lifecycle for candidate evidence/recordings.
4. WebSocket real-time messaging architecture with Lambda + DynamoDB connection management.
5. CloudFront static distribution with security headers (CSP, HSTS, X-Frame-Options) for `zamalat.cyce52.com`.
6. IaC templates (CloudFormation / SAM / Terraform) and local emulation options (DynamoDB local, SAM local).

