import { useState } from 'react';
import type { Locale } from './i18n';
import { architectureCopy as c, tr, type Text } from './architectureData';
import { aiEdges, aiNodes, aiTitle, modelPrices, thousandCallCost } from './aiArchitectureData';
import { ConnectionMap } from './ConnectionMap';
import { RagCosts } from './RagCosts';

export function AiArchitecture({ locale }: { locale: Locale }) {
  const [selection, setSelection] = useState('ai-model');
  const selected = aiNodes.find(node => node.id === selection)!;
  const t = (text: Text) => tr(text, locale);
  return <section className="ai-architecture">
    <h3>{t(['この AI はどう動く？', '这个 AI 如何运行？', 'How does this AI work?'])}</h3>
    <div className="architecture-map-heading"><div className="architecture-legend"><span>━ {tr(c.live, locale)}</span><span>┄ {tr(c.alternative, locale)}</span></div></div>
    <ConnectionMap nodes={aiNodes} edges={aiEdges} locale={locale} selected={selection} onSelect={setSelection} delivery={false} ai label={tr(aiTitle, locale)}/>
    <div className={`architecture-story ${selected.kind ?? ''}`} id="architecture-node-story"><span className="architecture-story-index">{String(aiNodes.indexOf(selected) + 1).padStart(2, '0')} / {aiNodes.length}</span><div><h3>{selected.titleText ? tr(selected.titleText, locale) : selected.title}</h3><p>{tr(selected.detail, locale)}</p></div></div>
    <section className="architecture-costs">
      <p className="architecture-eyebrow">DESIGN DECISION / 04 · USD</p>
      <h3>{t(['モデルと料金の比較', '模型与费用对比', 'Models & cost comparison'])}</h3>
      <p>{t(['入力はルール・資料・質問、出力はAIの返答です。tokenはモデルが文章を処理する単位で、1文字と同じではありません。次の表は同じ量の文章を処理する場合のモデル料金を比較します。', '输入是发给 AI 的规则、资料和问题，输出是 AI 的返回文字。token 是模型处理文字的计量单位，不等于一个字。下表按相同输入、输出量比较模型费用。', 'Input means the rules, reference and question sent to AI; output is the text AI returns. Tokens are model text units, not individual characters. The table compares model costs for the same input and output amounts.'])}</p>
      <p>{t(['東京 Mantle Standard・2026-11-16 確認。全行で1回6,000入力＋500出力tokens、1,000回を比較。選択中の235Bは約$2.15、月1,000回なら同額のモデル料金です。', '东京 Mantle Standard，2026-11-16 核对。统一按每次6,000输入＋500输出 tokens、1,000次比较。当前235B约 $2.15，若每月1,000次，这就是模型月费估算。', 'Tokyo Mantle Standard, checked 2026-11-16. Every row assumes 6,000 input + 500 output tokens per call, for 1,000 calls. Selected 235B costs about $2.15; at 1,000 calls/month that is the estimated monthly model cost.'])}</p>
      <p className="architecture-fineprint">{t(['小さな画面では表を左右にスクロールして全料金を確認できます。', '小屏幕可左右滑动表格，查看输出单价和千次费用。', 'On small screens, scroll the table sideways for output rates and per-1,000 costs.'])}</p>
      <div className="ai-price-scroll" role="region" aria-label={t(['モデル料金表', '模型价格表', 'Model pricing table'])} tabIndex={0}>
        <table className="ai-price-table"><thead><tr>{[
          ['モデル', '模型', 'Model'], ['入力 / 100万tokens', '输入 / 百万tokens', 'Input / 1M tokens'], ['出力 / 100万tokens', '输出 / 百万tokens', 'Output / 1M tokens'], ['1,000回', '1,000次', '1,000 calls'],
        ].map((label, i) => <th scope="col" key={i}>{t(label as unknown as Text)}</th>)}</tr></thead><tbody>{modelPrices.map(model => <tr key={model.name} className={model.selected ? 'is-selected' : ''}><th scope="row">{model.name}{model.selected && <small>{tr(c.live, locale)}</small>}</th><td>${model.input}</td><td>${model.output}</td><td>${thousandCallCost(model.input, model.output).toFixed(3)}</td></tr>)}</tbody></table>
      </div>
      <p className="architecture-fineprint">{t(['計算：入力tokens × 入力単価 / 100万 ＋ 出力tokens × 出力単価 / 100万。235Bで出力を1,024上限まで使う同じ入力仮定では1,000回約$2.705。実際はusageで変動し、文字数≠tokens。S3キャッシュでも毎回のモデル入力は有料。意味的拒否も有料です。', '公式：输入tokens × 输入单价 / 百万＋输出tokens × 输出单价 / 百万。相同输入假设下，235B每次用满1,024输出上限时，1,000次约 $2.705。实际按 usage 变化，字数≠tokens；S3缓存不免模型输入费，语义拒绝也收费。', 'Formula: input tokens × input rate / 1M + output tokens × output rate / 1M. At the same input assumption and the full 1,024 output cap, 235B costs about $2.705 per 1,000 calls. Actual usage varies; characters are not tokens. S3 caching does not waive model input charges. Semantic refusals also cost tokens.'])}</p>
      <p>{t(['32B・Nextはより安い試算ですが、同等の検証は未完了です。Coder・VLは用途が異なります。価格表は利用権やアカウント配額を保証しません。', '32B、Next 的估算更低，但尚未完成同等验证；Coder、VL 用途不同。价格表不代表账号已有权限或当前可用配额。', '32B and Next have lower estimates but lack equivalent validation; Coder and VL target other tasks. Listed prices do not guarantee account access or current quotas.'])}</p>
      <div className="ai-decisions">{[
        { title: t(['資料全文を渡す / S3', '传入完整资料 / S3', 'Send the full reference / S3']), body: ['採用：モデル約$2.15/1,000回＋S3保存・GET＋既存Lambda/API/ログ。新しいベクトル基盤は$0。資料が増えるほど入力料金も増えます。', '采用：模型约 $2.15/千次＋S3存储与GET＋现有Lambda/API/日志。不新增向量基础设施；资料增大时输入费用也增大。', 'Selected: model ≈$2.15/1,000 calls + S3 storage/GET + existing Lambda/API/logs. No added vector infrastructure. Larger references increase input cost.'] },
        { title: t(['別のAIで質問を分類', '额外调用 AI 判断问题范围', 'Use another AI call to classify the question']), body: ['未採用：同じ235Bで100入力＋50出力tokensの追加判定なら約+$0.08/1,000回、合計約$2.23。短い分類の仮定で、応答品質や実測値ではありません。', '未采用：假设再用同一235B做100输入＋50输出tokens的分类，千次约多 $0.08，合计约 $2.23；这是短分类假设，不是实测费用或质量结论。', 'Not selected: a second 235B call at an assumed 100 input + 50 output tokens adds ≈$0.08/1,000, totaling ≈$2.23. This short-classifier scenario is an estimate, not a measurement or quality result.'] },
        { title: t(['内容フィルター / Guardrails', '额外内容过滤 / Guardrails', 'Additional content filters / Guardrails']), body: ['未採用の追加案：内容フィルター＋拒否トピック各$0.15/1,000 text units。1回1,000文字入力＋2,000文字出力を両方検査なら約+$0.90/1,000回、モデルと計約$3.05。1 unitは最大1,000文字、検査ごと切上げ。他フィルターは別料金。', '未采用的额外方案：内容过滤、拒绝主题各 $0.15/千text units。每次检查1,000字输入＋2,000字输出，两项都启用时千次约多 $0.90，连模型约 $3.05。每unit最多1,000字、每次检查向上取整；其他过滤项另计。', 'Additional option, not selected: content filters and denied topics each cost $0.15/1,000 text units. Checking 1,000 input + 2,000 output characters with both adds ≈$0.90/1,000 calls; with the model ≈$3.05. Units are up to 1,000 characters, rounded per check. Other filters cost extra.'] },
      ].map(item => <article key={item.title}><h4>{item.title}</h4><p>{t(item.body as unknown as Text)}</p></article>)}</div>
      <RagCosts locale={locale}/>
      <p className="architecture-fineprint">{t(['すべて仮定に基づく比較で、実請求・無料枠適用後の金額・費用上限ではありません。税・通信・Lambda実行・HTTP API・S3・CloudWatch・CI/CD等は別。追加案の構成や検査対象で再計算が必要です。', '以上均为假设场景估算，不是实际账单、扣除免费额度后的价格或硬上限。税、传输、Lambda执行、HTTP API、S3、CloudWatch、CI/CD等另计；额外方案须按最终配置与检查内容重算。', 'These are scenario estimates, not bills, free-tier-adjusted prices or spending caps. Tax, transfer, Lambda execution, HTTP API, S3, CloudWatch and CI/CD are extra. Alternatives need recalculation for their final configuration and inspected content.'])}</p>
      <div className="cost-sources">AWS PRICING → {[
        ['Tokyo · Mantle Standard', 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonBedrock/current/ap-northeast-1/index.json'],
        ['Bedrock / Guardrails', 'https://aws.amazon.com/bedrock/pricing/'], ['S3 / Vectors', 'https://aws.amazon.com/s3/pricing/'],
        ['Qwen / Mantle API', 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-235b-a22b-2507.html'],
      ].map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{name}</a>)}</div>
    </section>
  </section>;
}
