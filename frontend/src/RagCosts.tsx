import type { Locale } from './i18n';
import { tr, type Text } from './architectureData';

export function RagCosts({ locale }: { locale: Locale }) {
  const t = (text: Text) => tr(text, locale);
  return <section className="rag-costs">
    <h3>{t(['知識ベースは何に料金がかかる？', 'RAG 知识库贵在哪里？', 'What makes a RAG knowledge base expensive?'])}</h3>
    <p>{t(['知識ベースは資料の取込・検索の仕組みです。料金は選ぶ保存・検索サービスで変わります。2026-11-16確認。以下はUSDで、現在のサイトに追加した資源ではありません。', '知识库负责导入、检索资料，费用取决于背后选择的存储和搜索服务。以下按 2026-11-16 官方价格比较，单位 USD；这些资源尚未接入本网站。', 'A knowledge base imports and retrieves reference material. Cost depends on the storage and search services selected. These USD examples use official prices checked 2026-11-16; none of these resources has been added to this site.'])}</p>
    <div className="ai-decisions">
      <article><h4>OpenSearch Serverless Classic</h4>
        <p>{t(['東京は計算枠1 OCUあたり$0.334/時。開発・テスト構成は索引用0.5＋検索用0.5、計1 OCUで、730時間なら約$243.82/月。待機系ありは計2 OCUで約$487.64/月。アクセスがなくても最低計算枠を維持するため、この構成は小規模サイトには重い選択です。', '东京每个计算单位 OCU 为 $0.334/小时。开发测试配置最低为索引0.5＋查询0.5，共1 OCU；按730小时约 $243.82/月。带冗余配置共2 OCU，约 $487.64/月。即使没人提问也维持最低计算容量，这类方案对小网站开销较大。', 'Tokyo compute is $0.334 per OCU-hour. Dev/test starts at 0.5 indexing + 0.5 search, totaling 1 OCU: about $243.82/month at 730 hours. Redundant configuration totals 2 OCUs: about $487.64/month. These minimum capacities keep billing even without questions, making this configuration costly for a small site.'])}</p>
        <p className="architecture-fineprint">{t(['これは最初の独立したClassicベクトル検索構成の計算費だけです。保存・Embedding・回答モデルは別。負荷により計算枠は増えます。', '这里只算首个独立 Classic 向量搜索配置的最低计算费用；存储、Embedding、回答模型另计，负载上升还会增加计算用量。', 'This is only the minimum compute for a first standalone Classic vector-search configuration. Storage, embeddings and answer generation are extra, and higher load can increase compute.'])}</p>
      </article>
      <article><h4>OpenSearch Serverless NextGen</h4>
        <p>{t(['NextGenは10分間使われなければ計算枠を0にできます。課金は実際の計算時間と保存量で、Classicの月$244／$488という最低計算費をそのまま当てはめません。利用が散らばると待機時間の課金も変わるため、月の質問数だけでは算出できません。', 'NextGen 无请求10分钟后可将计算容量缩到0，按实际计算用量和存储收费，不适用 Classic 的上述最低月费。请求分布会影响活跃、等待时间，不能只用每月提问次数算出总价。', 'NextGen can scale compute to zero after 10 minutes of inactivity. It bills actual compute usage and storage, so the Classic monthly floors above do not apply. Request timing affects active and idle periods; a monthly question count alone cannot determine its cost.'])}</p>
        <p className="architecture-fineprint">{t(['このサイトでのKnowledge Bases接続・利用可否は未検証です。', '本项目尚未验证该模式与知识库的接入及可用性。', 'Knowledge Bases integration and availability for this project have not been verified.'])}</p>
      </article>
      <article><h4>S3 Vectors</h4>
        <p>{t(['東京のベクトル保存は$0.066/GB・月、検索リクエストは$0.0027/1,000回。別途、検索で処理するデータ量、返却量、書込量に課金。Classicの常駐計算枠は不要ですが、Embeddingと回答モデルの料金は残ります。', '东京向量存储 $0.066/GB·月，查询请求 $0.0027/千次；还按查询处理的数据量、返回量和写入量收费。它不需要 Classic 那样的常驻计算容量，但仍要计入 Embedding 和回答模型费用。', 'Tokyo vector storage is $0.066/GB-month and query requests are $0.0027/1,000. Query data processed, data returned and writes are charged separately. It needs no Classic-style always-on compute capacity; embedding and answer-model charges still apply.'])}</p>
      </article>
      <article><h4>Bedrock Managed Knowledge Base</h4>
        <p>{t(['公式掲載額は元データ$5/GB・月＋通常検索$1/1,000回。管理モデルの解析・Embedding・並べ替えを含みます。仮に元データ1 GB・月1,000検索なら$6に回答モデル代を追加。これは1 GBを置く試算で、このサイトの資料サイズではありません。', '官方列价为原始资料 $5/GB·月＋标准检索 $1/千次，包含其托管模型的解析、Embedding 和重排序。假设原始资料1 GB、每月1,000次标准检索，则 $6 再加回答模型费；1 GB 是估算场景，不是本项目资料量。', 'The published rate is $5/GB of raw data per month plus $1/1,000 standard retrievals, including its managed parsing, embeddings and reranking. An assumed 1 GB and 1,000 monthly retrievals costs $6 plus the answer model. That 1 GB is an example, not this site’s reference size.'])}</p>
        <p className="architecture-fineprint">{t(['カスタムモデル・複数段の自律検索等は別料金。東京での採用可否は未確認です。', '自选模型、多步自主检索等另计；尚未确认本项目在东京的采用条件。', 'Custom models and multi-step agentic retrieval incur other charges. Adoption requirements in Tokyo have not been verified for this project.'])}</p>
      </article>
    </div>
    <p>{t(['比較条件を揃え、月1,000回・回答モデルへの入力2,000／出力500 tokensと仮定すると、Qwen部分は約$1.07/月。Classicでは計算費と合わせて最低約$244.89／$488.71に、保存・Embedding等が加わります。現在の全文方式は入力6,000／出力500でモデル約$2.15/月。小さな資料にはまず今の方式を使い、資料が増えたら低固定費の検索方式も比較します。', '统一假设每月1,000次、检索后给模型2,000输入／500输出 tokens，Qwen 部分约 $1.07/月。Classic 加上计算费后至少约 $244.89／$488.71，再另加存储、Embedding 等。当前全文方式按6,000输入／500输出估算，模型约 $2.15/月。资料规模较小时先用当前方式，资料增大后再比较低固定开销的检索方案。', 'Assuming 1,000 calls/month and 2,000 input + 500 output tokens after retrieval, the Qwen portion is about $1.07/month. With Classic compute, this starts around $244.89/$488.71 before storage, embeddings and other charges. Current full-context generation at 6,000 input + 500 output tokens is about $2.15/month. Start with full context for this small reference and compare low-fixed-cost retrieval options as it grows.'])}</p>
    <p className="architecture-fineprint">{t(['すべて仮定の比較。税・転送・Lambda/API等は別で、請求額や上限ではありません。', '以上为假设场景比较，税、传输、Lambda/API 等另计，不是账单或硬上限。', 'These are scenario estimates, not bills or caps. Tax, transfer, Lambda/API and other charges are extra.'])}</p>
    <div className="cost-sources">AWS PRICING → {[
      ['OpenSearch · Classic / NextGen', 'https://aws.amazon.com/opensearch-service/pricing/'],
      ['Tokyo · OpenSearch', 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonES/current/ap-northeast-1/index.json'],
      ['Tokyo · S3 Vectors', 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-northeast-1/index.json'],
      ['Managed Knowledge Base', 'https://aws.amazon.com/bedrock/pricing/'],
    ].map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{name}</a>)}</div>
  </section>;
}
