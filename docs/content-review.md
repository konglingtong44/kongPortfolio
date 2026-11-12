# Website content and flow review — 2026-11-13

Reviewed the public Japanese, Chinese and English content, navigation, architecture/recovery diagrams, deployment scripts and Terraform configuration. Japanese received the main editorial pass. Experience dates, team sizes, credentials and technical scope were preserved.

| Finding | Change |
| --- | --- |
| Japanese literal translations such as 切流, 制品 and 後端 | Replaced with standard Japanese deployment terms; shortened repeated PMO descriptions and removed the repeated greeting. |
| Public copy referred to PDF/XLS source documents | Rewrote the descriptions around responsibilities and scope in all three languages. |
| Development notes still planned the first AWS release and ECR | Updated notes to the recorded serverless deployment and remaining Bedrock/recovery work; removed unused roadmap copy. |
| SYSTEM repeated the project's architecture dialog | Replaced that toolbox card with standalone development notes. |
| Bedrock button said test and suggested an imminent chat feature | Localized the preparation-status action and explicitly stated that no model is called. |
| Diagram could imply a remote JSON service or a planned DNS alias | Marked JSON as bundled in the Lambda ZIP; removed the planned edge style from the deployed DNS alias. |
| Traffic percentages could look like guaranteed observed ratios | Identified them as configured weights; noted sampling variance at low traffic. |
| Stop-only could be mistaken for rollback | Named CodeDeploy's explicit Stop and roll back deployment action. Recovery control lines are separately labeled. |
| Initial hash links could move after profile content loaded | Repositioned the initial anchor once asynchronous content enters the layout, with a regression check. |

Technical references: [weighted Lambda aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html), [CodeDeploy stop and rollback](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-stop.html). Project-specific automation was checked against source configuration and execution records.

Verification: frontend build and 51 tests; backend HTTP tests, Lambda adapter tests and packaged-ZIP smoke; local frontend recovery and CloudFront routing checks; secret/path checks. Local Chrome checked Japanese copy, notes/status actions and initial hash navigation. This is a content/source review, not a new AWS deployment or live fault drill. Physical mobile devices, other browsers, current AWS account state and billing were not independently audited.
