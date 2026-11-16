import type { ArchitectureNode, Edge, Text } from './architectureData';

export const aiTitle: Text = ['04 / AI Q&A', '04 / AI 问答', '04 / AI Q&A'];
export const aiLink: Text = ['04 / AI の構成・料金を見る →', '04 / 查看 AI 架构与费用 →', '04 / Explore AI architecture & costs →'];
const node = (id: string, title: string, titleText: Text, x: number, y: number, sub: Text, detail: Text, kind?: 'alternative'): ArchitectureNode => ({ id, title, titleText, x, y, sub, detail, kind });
export const aiNodes: ArchitectureNode[] = [
  node('question', 'React / Visitor', ['訪問者のブラウザ', '访客浏览器', 'Visitor browser'], 25, 80,
    ['React / 質問を送信', 'React / 发送问题', 'React / send a question'],
    ["画面に質問を入力し、送信時にmessageと回答言語languageをJSONでJavaへ送ります。例の選択だけではAIを呼びません。前の会話は送らず、毎回独立した質問です。", "页面点击发送后，将问题 message 与回答语言 language 作为 JSON 交给 Java。选择示例不调用 AI；每次只发送本次问题，不带上次对话。", "Send posts the question as message and the response language as language to Java in JSON. Choosing an example does not call AI. Each request contains only the current question, without previous conversation."]),
  node('ai-cdn', 'CloudFront', ['サイトの入口 / CloudFront', '网站入口 / CloudFront', 'Website entry / CloudFront'], 235, 80,
    ['HTTPS / APIへ転送', 'HTTPS / 转发给后端', 'HTTPS / forward to API'],
    ['CloudFrontはAWSの配信サービスです。画面のファイルを配信し、質問の宛先 /api/bedrock は後ろのAPI Gatewayへ転送します。質問と回答はキャッシュせず、他の訪問者に使い回しません。HTTPSで通信を暗号化し、ブラウザからAIや非公開資料を直接呼びません。', 'CloudFront 是 AWS 的网站分发服务：页面文件由它分发，发往 /api/bedrock 的问题由它转交给后面的 API Gateway。问题和回答不缓存，不会把别人的回答当缓存复用。HTTPS 加密传输；浏览器不直接访问 AI 或私有资料。', 'CloudFront is the AWS service delivering the site. It serves page files and forwards /api/bedrock questions to API Gateway. Questions and answers are not cached for reuse by other visitors. HTTPS encrypts transport; the browser does not directly access AI or private reference files.']),
  node('ai-api', 'API Gateway', ['受付・流量制限', '请求入口与限流', 'Request entry & rate limit'], 445, 80,
    ['API Gateway / 約10秒に1件', 'API Gateway / 约10秒1个', 'API Gateway / ~1 per 10s'],
    ["API Gatewayが質問を受け付け、公開中のLambdaへ渡します。全訪問者で約10秒に1件の受付枠を補充し、空き枠は最大1件まで保持。超過時は429を返します。厳密な回数や費用の上限ではありません。", "API Gateway 接收问题并转交线上 Lambda。所有访客共用的接收名额约每10秒补充1个，最多保留1个空闲名额；超出时返回429。这是请求速度控制，不是严格的次数或费用上限。", "API Gateway forwards questions to the published Lambda. Shared across visitors, capacity replenishes about once per 10 seconds, retaining at most one unused slot. Excess requests get 429. This controls rate, not an exact request or spending cap."]),
  node('ai-java', 'Lambda / Java 21', ['Javaの入力チェック', 'Java 检查输入', 'Java checks input'], 865, 80,
    ['Lambda / Spring Boot', 'Lambda / Spring Boot', 'Lambda / Spring Boot'],
    ['Lambdaはリクエスト時にJava 21 / Spring Bootを実行するサービスです。JavaはまずURLとJSON形式を確認し、本文を8 KiB以内、項目をmessageとlanguageだけに制限します。両方が文字列で、質問は空白でなく1,000 Unicodeコードポイント以内、回答言語の指定も確認。不正ならAIを呼ぶ前に400/413/415を返します。各実行環境では同時1件、毎分6件・毎時60件まで。複数環境で共通のカウンタではありません。本番はメモリ1,024 MB、実行28秒まで、同時実行枠5です。', 'Lambda 是按请求运行 Java 21 / Spring Boot 的 AWS 服务。Java 先检查请求路径和 JSON 格式：整个请求体不超过8 KiB，只能有 message、language 两个字段且都必须是字符串；问题去除首尾空白后不能为空，最多1,000个 Unicode 码点；同时检查回答语言参数。不合法时在调用 AI 前返回400/413/415。每个运行实例还限制同时1个问题、每分钟6次、每小时60次；多个实例不会共享这个计数。生产配置为1,024 MB内存、最多运行28秒、预留5个并发名额。', 'Lambda runs Java 21 / Spring Boot for requests. Java checks the URL and JSON first: body at most 8 KiB, only message and language fields, both strings. After trimming, the question must be nonblank and at most 1,000 Unicode code points; the response language must be valid. Invalid requests return 400/413/415 before calling AI. Each running instance allows one in flight, six/minute and 60/hour; counters are not shared across instances. Production has 1,024 MB memory, a 28-second timeout and five reserved concurrent executions.']),
  node('ai-facts', 'Private S3', ['参照資料 / 非公開S3', '参考资料 / 私有 S3', 'Reference / private S3'], 865, 270,
    ['承認済みの版＋内容照合', '审核版本＋内容核对', 'Approved version + checksum'],
    ["非公開S3に確認・脱敏済みの経歴資料を保存します。承認した版を読み、内容の照合値も一致するか確認。不一致や読取失敗ならAIを呼びません。読み取った資料は実行環境のメモリで再利用し、更新には承認済みの新しい版を指定します。訪問者の発言は書き戻しません。", "私有 S3 保存审核、脱敏后的经历资料。后端读取审核通过的那一版，并核对文件内容是否一致；不一致或读取失败就不调用 AI。读取后在运行实例的内存中复用，更新需明确指定新审核版本。访客说法不会写回资料。", "Private S3 stores reviewed, redacted career facts. The backend reads the approved revision and checks its contents. A mismatch or read failure stops the AI call. Instances reuse the reference in memory; updates must select a newly approved revision. Visitor claims never change it."]),
  node('ai-prompt', 'Prompt / IAM Role', ['指示・資料・質問を組立て', '组合规则、资料与问题', 'Assemble rules, facts & question'], 655, 270,
    ['Prompt / IAM実行権限', '提示词 / IAM 运行权限', 'Prompt / IAM permissions'],
    ["AIに渡す文章を組み立てます。systemには資料に基づく回答・無関係な依頼の拒否というルールと資料、userには今回の質問を入れます。Lambdaに付与したIAM権限で東京の指定モデルを呼び、ブラウザにはAWSの認証情報を渡しません。", "后端组合发给 AI 的文字：system 消息放依据资料回答、拒绝无关请求等规则及参考资料，user 消息放本次问题。使用分配给 Lambda 的 IAM 权限调用东京的指定模型，浏览器不持有 AWS 凭证。", "The backend assembles the AI input: system holds the reference and rules to answer from it and refuse unrelated tasks; user holds the current question. IAM permissions assigned to Lambda authorize the selected Tokyo model. The browser receives no AWS credentials."]),
  node('ai-model', 'Bedrock / Qwen3 235B', ['AI生成 / Qwen3 235B', 'AI 生成 / Qwen3 235B', 'AI generation / Qwen3 235B'], 445, 270,
    ['Bedrock / Mantle経由', 'Bedrock / 经 Mantle 调用', 'Bedrock / via Mantle'],
    ['BedrockのMantle APIから、文章生成モデルQwen3 235Bを東京で呼びます。1回で質問が範囲内か判断して回答し、全文をまとめて返します。出力は最大1,024 tokens、モデルとの通信は15秒まで。失敗時は自動で再呼出しせず、利用者が再試行を選びます。', '通过 Bedrock 的 Mantle API 调用东京的文字生成模型 Qwen3 235B，一次完成范围判断和回答，生成全文后一起返回。输出最多1,024 tokens，模型通信最多等待15秒；失败后不自动再次付费调用，由访客决定是否重试。', 'Calls the Qwen3 235B text model in Tokyo through the Bedrock Mantle API. One call checks scope and answers, returning the complete text together. Output is capped at 1,024 tokens and model communication at 15 seconds. No automatic second paid call is made on failure; visitors choose whether to retry.']),
  node('ai-answer', 'Java → React', ['回答を確認して表示', '检查并显示回答', 'Check & display answer'], 235, 270,
    ['JSON形式 / 回答・拒否', 'JSON 格式 / 回答或拒绝', 'JSON / answer or refusal'],
    ['AIにはdecision（回答か拒否か）とanswer（本文）のJSONを返させます。Javaは項目名・型・重複・余分な内容・途中切れを確認し、不正な出力は502で終了。拒否時の本文はサーバーの定型文に置き換えます。usageは実際に使った入出力token数です。無関係と判断して断る場合も、AIが処理したため有料。これは構造のチェックであり、回答の全事実を証明するものではありません。', '要求 AI 返回 JSON：decision 表示回答还是拒绝，answer 是正文。Java 检查字段名、类型、重复字段、额外内容和输出是否截断；不合格返回502，不把破损结果展示出来。拒绝时用服务器固定提示替换正文。usage 是实际消耗的输入、输出 token 数；AI 判断后拒绝也已经产生费用。结构校验不能证明每句话都符合事实，仍可能有误判或编造。', 'AI returns JSON with decision (answer or refuse) and answer (text). Java checks field names, types, duplicates, extra content and truncation. Invalid output returns 502 instead of displaying broken results. Refusals use fixed server text. Usage records actual input/output tokens; a refusal after model processing still costs money. Structural validation cannot prove every factual claim is correct.']),
  node('ai-ops', 'CloudWatch / Budgets', ['ログ・費用監視', '日志与费用监控', 'Logs & cost monitoring'], 25, 270,
    ['CloudWatch / Budgets', 'CloudWatch / Budgets', 'CloudWatch / Budgets'],
    ['CloudWatchは動作ログ、BudgetsはAWS費用を監視するサービスです。アプリログには質問・回答・履歴書本文を残しません。既存の月$5/$10/$15/$25の段階的保護を使い、停止時は実行ロールのAI呼出し権限を拒否し、Lambda同時実行枠を0にできます。費用検知には遅れがあるので、請求が指定額で必ず止まる保証ではありません。', 'CloudWatch 收集运行日志，Budgets 监控 AWS 费用。应用日志不记录问题、回答或简历正文。复用月度 $5/$10/$15/$25 分级保护；关停时可撤销运行角色的 AI 调用权限，并将 Lambda 并发名额设为0。费用统计有延迟，所以不是保证账单到指定金额立即停止的硬上限。', 'CloudWatch collects operational logs; Budgets monitors AWS costs. Application logs omit questions, answers and resume text. Existing monthly $5/$10/$15/$25 protection stages can deny the runtime role AI calls and set Lambda concurrency to zero. Cost detection is delayed, so billing is not guaranteed to stop exactly at a threshold.']),
  node('alt-rag', 'Knowledge Bases / RAG', ['関連資料を検索 / RAG', '先检索资料 / RAG', 'Retrieve reference / RAG'], 780, 485,
    ['Knowledge Bases / 未採用', 'Knowledge Bases / 未采用', 'Knowledge Bases / alternative'],
    ['RAGは資料を先に検索し、関連部分だけをAIへ渡す方法です。資料の数値変換、検索用保存、検索処理が加わります。東京のOpenSearch Serverless Classicなら最低計算費だけで約$244/月、待機系ありは約$488/月。S3 VectorsやNextGenでは料金体系が異なります。今回は小さな資料をS3から全文で渡し、詳細な構成別料金は下に示します。', 'RAG 先检索资料，再把相关片段交给 AI，需要增加资料转换、索引存储和查询。若用东京 OpenSearch Serverless Classic，仅最低计算费约 $244/月，带冗余约 $488/月；S3 Vectors、NextGen 的收费方式不同。当前资料较小，先用 S3 全文传入，下方列出各配置费用。', 'RAG retrieves relevant passages before sending them to AI, adding document conversion, index storage and queries. Tokyo OpenSearch Serverless Classic minimum compute is about $244/month, or $488 with redundancy. S3 Vectors and NextGen have different pricing. This small reference currently uses full text from S3; configuration-specific costs are listed below.'], 'alternative'),
  node('alt-guard', 'Classifier / Guardrails', ['追加の内容チェック', '额外内容检查', 'Additional content checks'], 520, 485,
    ['分類モデル / Guardrails', '分类模型 / Guardrails', 'Classifier / Guardrails'],
    ['分類モデルは、本題に関係するかを別のAI呼出しで先に判定する案。Guardrailsは、禁止内容・個人情報等を検査するBedrockの追加機能です。どちらも費用や処理時間が増えるため、現在は1回のQwenで範囲判断と回答を行い、Javaで形式を確認します。追加検査なら安全が完全になるわけでも、現方式で誤回答がなくなるわけでもありません。必要性と追加料金を比較して再検討できます。', '分类模型方案是先多调用一次 AI，判断问题是否与本人相关；Guardrails 是 Bedrock 额外检查禁止内容、敏感信息等的功能。两者会增加费用或处理时间，当前选择一次 Qwen 同时判断范围并回答，再用 Java 检查格式。额外检查也不能保证绝对安全，现有方式也不能保证没有错误；以后可按保护效果和新增费用重新评估。', 'A separate classifier would make another AI call to decide whether the question concerns this person. Guardrails is a Bedrock feature checking prohibited content, sensitive information and more. These add cost or processing time. Currently one Qwen call decides scope and answers, then Java validates the format. Extra checks do not guarantee complete safety, and the current approach cannot guarantee error-free answers. Protection and cost can be reevaluated.'], 'alternative'),
];
export const aiEdges: Edge[] = [
  { from: 'question', to: 'ai-cdn', path: 'M205 125 H235', label: 'POST', x: 220, y: 108 },
  { from: 'ai-cdn', to: 'ai-api', path: 'M415 125 H445' },
  { from: 'ai-api', to: 'ai-java', path: 'M625 125 H865', label: '/api/bedrock', x: 745, y: 108 },
  { from: 'ai-java', to: 'ai-facts', path: 'M955 170 V270', label: 'read file', x: 945, y: 225 },
  { from: 'ai-facts', to: 'ai-prompt', path: 'M865 315 H835' },
  { from: 'ai-prompt', to: 'ai-model', path: 'M655 315 H625' },
  { from: 'ai-model', to: 'ai-answer', path: 'M445 315 H415', label: 'JSON', x: 430, y: 300 },
  { from: 'ai-answer', to: 'question', path: 'M325 270 V210 H115 V170', label: 'HTTP response', x: 220, y: 200 },
  { from: 'ai-java', to: 'ai-ops', path: 'M955 170 V400 H115 V360', label: 'logs / cost control', x: 530, y: 417 },
  { from: 'ai-facts', to: 'alt-rag', path: 'M955 360 V445 H870 V485', dashed: true },
  { from: 'ai-prompt', to: 'alt-guard', path: 'M745 360 V445 H610 V485', dashed: true },
];

// Tokyo Mantle Standard, official regional AWS Price List checked 2026-11-16.
export const modelPrices = [
  { name: 'Qwen3 235B A22B 2507', input: 0.27, output: 1.06, selected: true },
  { name: 'Qwen3 32B', input: 0.18, output: 0.73 },
  { name: 'Qwen3 Next 80B A3B', input: 0.168, output: 1.44 },
  { name: 'Qwen3 Coder 30B A3B', input: 0.18, output: 0.73 },
  { name: 'Qwen3 Coder 480B A35B', input: 0.54, output: 2.18 },
  { name: 'Qwen3 VL 235B A22B', input: 0.64, output: 3.22 },
];
export const thousandCallCost = (input: number, output: number, outputTokens = 500) => (6000 * input + outputTokens * output) / 1000;
