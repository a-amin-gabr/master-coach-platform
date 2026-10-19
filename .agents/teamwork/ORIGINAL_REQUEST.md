# Original User Request

## 2026-10-16T04:54:57Z

Transform the Master Coach Fellowship Platform (`zamalat.cyce52.com` / Tamkeen Al-Roaya) into a production-grade, AWS-Native serverless application operating strictly within AWS Always-Free tier resources, while executing a complete academic audit to align all texts, rubrics, and case studies verbatim with Coach Abdelkarim Al-Khelaifi's official 2026 curriculum.

Working directory: /home/agabr/github/abdallahgabr-portfolio/freelance/arabic-platforms/proposals/2026-10-05_Coach-Abdelkarim/master_coach_platform
Integrity mode: development

Requested team: Full multi-agent team (Cloud Serverless Solutions Architect, Arabic Content & Curriculum Specialist, Full Stack Engineer, QA & Verification Lead)

## Requirements

### R1. Academic Content & Curriculum Alignment (Verbatim 2026 Portfolio Standards)
- Eradicate all generic placeholder phrases, inaccurate terminology, and informal mock copy across all views, modal dialogs, and reports.
- Synchronize all 6 official evaluation rubrics (الجلسات المهنية، ملف الإنجاز، الورقة العلمية، المشروع الابتكاري، المقابلة الختامية، الإشراف المهني) with the 2026 Arab Coaching Federation operational appendix verbatim across all 5 performance levels (ضعيف 1، مقبول 2، جيد 3، جيد جداً 4، ممتاز 5), exact criterion weights (20% or 25%/15%), and critical ethical pass/fail conditions.
- Embed authentic, publication-quality Arabic text for candidate profile, 8 submission milestones, 14 competency domains, structured 4-part reflections ("ماذا فعلت؟ ولماذا؟ وما أثره؟ وما الذي سأغيره؟"), supervisor voice/text rubrics notes, and clinical case studies for the 90 tool assessments (MBTI, Wheel of Life, SWOT).

### R2. AWS-Native Serverless Backend Architecture (Targeting AWS Always-Free Tier)
- Architect the backend to run natively on AWS Always-Free tier services to minimize operational costs permanently for `zamalat.cyce52.com`:
  - **Storage & Evidence:** AWS S3 for document, recording, and image uploads with pre-signed URLs.
  - **Database:** Amazon DynamoDB (using free 25 provisioned RCU/WCU & 25 GB storage) with single-table design for users, tasks, evidence, tool applications, rubrics evaluations, and chat messages.
  - **Compute & APIs:** AWS Lambda (Node.js) behind Amazon API Gateway (HTTP APIs / WebSocket APIs) or Lambda Function URLs for serverless execution well within the 1,000,000 free monthly invocations.
  - **Real-Time Communication:** Real-time messaging via API Gateway WebSocket API connecting to Lambda and DynamoDB connection-state tables, with REST fallback.
  - **Infrastructure as Code:** Provide complete deployment templates (AWS SAM / CloudFormation / Serverless Framework / Terraform) with automated local emulation capabilities for testing (e.g. DynamoDB Local / SAM local).

### R3. Edge Distribution & Production Frontend Polish (`zamalat.cyce52.com`)
- Configure static frontend distribution via **Amazon CloudFront** and S3 with automated caching, compression, HTTPS/SSL, and security headers (CSP, HSTS, X-Frame-Options).
- Ensure the single-page responsive user interface is completely seamless across mobile (375px+), tablet, and desktop displays with 0px horizontal canvas overflow, fluid touch-scrolling tabs, and high-contrast light/dark themes.
- Provide a dual-mode local runner (running both local Express/SQLite for offline development/automated CI tests, and AWS Serverless Lambda/DynamoDB deployment scripts for production).

## Acceptance Criteria

### Content Rigor & Academic Compliance
- [ ] Every rubric title, criterion, weight, and 5-tier descriptive level matches the official 2026 Arab Coaching Federation appendix word-for-word without truncation or fabrication.
- [ ] All 8 submission tasks and 90 tool entry forms feature realistic, professional Arabic guidance and coaching terminology (CPC/PCC equivalence, Pfeiffer modified model, LMMI indicator, 4-part reflection).
- [ ] Zero grammatical errors, placeholder text ("lorem ipsum" or generic mock text), or missing labels exist across the application.

### AWS Serverless & Architecture Integrity
- [ ] CloudFormation / SAM / Terraform template correctly defines S3 bucket, DynamoDB table schemas, Lambda handlers, and API Gateway routes strictly configured to stay within AWS Always-Free tier thresholds.
- [ ] End-to-end local automated test suite (`npm run test:all`) passes with 100% success rate, verifying data integrity, rubric evaluations, anti-duplication, and ethical blocker enforcement.
- [ ] Clear step-by-step production deployment guide specifically for pointing `zamalat.cyce52.com` to CloudFront distribution and API Gateway.
- [ ] Seamless mobile responsive layout verified on 375px–414px viewports with zero horizontal scrolling (`docScrollWidth === 390px`).
