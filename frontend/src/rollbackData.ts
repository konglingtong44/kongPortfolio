import type { Text } from './architectureData';

export const rollbackCopy = {
  title: ['故障時の切り戻し', '出错后，怎样恢复？', 'When a release goes wrong'],
  intro: ['公開した新バージョンで問題が起きたら、何を検知し、どの向き先を戻すのか。3 つの障害シナリオを、順番にたどるデモです。', '新版本上线后出错，谁来发现、谁来回退、到底切换哪个指向？用三个故障场景逐步演示。', 'What detects a broken release, what rolls it back, and which pointer changes? Follow three failure scenarios step by step.'],
  simulation: ['説明用シミュレーション / AWS 操作なし', '教学模拟 / 不操作 AWS', 'Illustrative simulation / no AWS actions'],
  play: ['自動再生', '播放动画', 'Play animation'], pause: ['一時停止', '暂停', 'Pause'], next: ['次のステップ', '下一步', 'Next step'], previous: ['前へ', '上一步', 'Previous step'], reset: ['最初から', '重置', 'Reset'],
  phases: [['新バージョン公開', '新版本上线', 'New release'], ['故障発生', '发生故障', 'Failure'], ['検知・停止', '检测并停止', 'Detect & stop'], ['切り戻し', '执行回退', 'Roll back'], ['復旧確認', '确认恢复', 'Verify recovery']],
  old: ['旧・安定版', '旧稳定版本', 'Previous stable'], fresh: ['新バージョン', '新版本', 'New version'],
  failed: ['エラー発生', '出现错误', 'Failing'], isolated: ['配信対象から外す', '退出服务流量', 'Removed from traffic'],
  traffic: ['リクエストの流れ', '请求流量', 'Request traffic'], returning: ['安定版へ切り戻す', '回退到稳定版本', 'Restore stable version'],
  boundary: ['現在の構成との対応', '与当前实现的对应关系', 'How this maps to the current system'],
} satisfies Record<string, Text | readonly Text[]>;

export const rollbackScenarios = [
  {
    id: 'frontend', title: ['フロントエンド公開後', '前端上线后出错', 'Frontend release failure'] as Text,
    router: 'CloudFront Function', old: 'S3 · previous release', fresh: 'S3 · new release',
    observer: 'Public HTTPS checks → release script',
    steps: [
      ['CloudFront LIVE の参照先を新しい S3 release に公開。旧 release も残しています。', 'CloudFront LIVE 已指向新的 S3 release，旧 release 仍然保留。', 'CloudFront LIVE points to the new S3 release. The previous release is retained.'],
      ['公開後の確認で、version.json の不一致や静的ファイルの検証エラーが発生した例。', '模拟发布后的检查发现 version.json 不匹配或静态文件校验失败。', 'A simulated post-publication check finds a version.json mismatch or static-asset verification failure.'],
      ['公開スクリプトが失敗を検知して通常の公開を停止。保存しておいた旧ルートと ETag を使って回復を試みます。', '发布脚本检测失败，停止正常发布，利用保留的旧路由和 ETag 尝试恢复。', 'The release script detects the failure, stops normal publication and attempts recovery using the saved previous route and ETag.'],
      ['CloudFront Function の LIVE 参照先を旧 release に戻します。バックエンド Lambda の成功バージョンは戻しません。', '将 CloudFront Function 的 LIVE 发布指向切回旧 release；成功上线的后端 Lambda 保持原样。', 'Restore the CloudFront Function LIVE pointer to the previous release. The successfully deployed backend Lambda stays in place.'],
      ['公開 version.json とページ、API を再確認。旧フロントエンドと現在の API の互換性も必要です。', '重新检查公网 version.json、页面与 API。旧前端必须兼容当前后端。', 'Recheck public version.json, pages and APIs. The previous frontend must remain compatible with the current backend.'],
    ] as Text[],
    boundary: ['復元処理は公開スクリプトにありますが、LIVE 切り替え後の実際の障害からの復旧は未検証です。公開完了後に発生した任意の障害を常時自動検知する仕組みではありません。通信断・強制終了時には手動復旧が必要な場合があります。', '发布脚本已有恢复逻辑，但 LIVE 切换后真实故障回退尚未演练。它不是发布结束后持续监控任意前端故障的自动系统；断网或进程被强制终止时可能需要人工恢复。', 'The release script has recovery logic, but a real failure after LIVE switching has not been drilled. This is not continuous automatic detection of arbitrary frontend faults after publication. Network loss or termination can require manual recovery.'] as Text,
  },
  {
    id: 'application', title: ['バックエンドアプリケーション障害', '后端应用失败', 'Backend application failure'] as Text,
    router: 'Lambda · live alias', old: 'Blue · stable version', fresh: 'Green · new version',
    observer: 'API checks → operator → CodeDeploy',
    steps: [
      ['二段階承認後、カナリア配信中。Blue 90% / Green 10% で新しいアプリを確認しています。', '两道审批后进入金丝雀阶段：Blue 90% / Green 10%，观察新应用。', 'After both approvals, the canary sends Blue 90% / Green 10% while the new application is observed.'],
      ['Green が HTTP 500 や不正な応答を返す例。Lambda の呼び出し自体は成功する場合もあります。', '模拟 Green 返回 HTTP 500 或错误业务响应。此时 Lambda 调用本身也可能被记为成功。', 'Green returns HTTP 500 or an incorrect business response. The Lambda invocation itself may still be recorded as successful.'],
      ['API の確認で異常を発見。現在は担当者が調査し、CodeDeploy に自動ロールバック付きの停止を要求する経路を示しています。', 'API 检查发现异常。此处演示当前可采用的人工确认后请求 CodeDeploy 停止并自动回滚的路径。', 'API checks reveal the issue. This path shows an operator confirming it and asking CodeDeploy to stop with automatic rollback enabled.'],
      ['CodeDeploy が切り戻しを実行。live の Green 追加重みを取り除き、Blue 100% に戻します。', 'CodeDeploy 执行回退，移除 live 中 Green 的附加权重，恢复 Blue 100%。', 'CodeDeploy rolls back, removes Green’s additional weight from live and restores Blue 100%.'],
      ['live の版と重み、health・三言語 API を確認して復旧を判断。失敗した Green は配信しません。', '核对 live 版本与权重、health 和三语 API，确认恢复。失败的 Green 不再接收流量。', 'Check live’s version and weights, health and trilingual APIs to confirm recovery. The failed Green no longer receives traffic.'],
    ] as Text[],
    boundary: ['停止要求 → CodeDeploy 自動ロールバックは検証済みですが、アプリ障害を起こした個別の検証は未実施です。業務応答や HTTP 500 を常時判定するアプリ専用の自動検知は未構築。Lambda Errors と HTTP ステータスは同じではありません。', '停止请求 → CodeDeploy 自动回滚已验证，但故意触发应用失败的独立演练尚未完成。当前没有持续判断业务响应或 HTTP 500 的应用级自动检测；Lambda Errors 不等同于 HTTP 状态码。', 'Stop-triggered CodeDeploy rollback is verified; a separate application-failure drill is not. Dedicated continuous detection of bad business responses or HTTP 500 is not implemented. Lambda Errors is not the same as HTTP status.'] as Text,
  },
  {
    id: 'alarm', title: ['CloudWatch アラーム', 'CloudWatch 告警', 'CloudWatch alarm'] as Text,
    router: 'Lambda · live alias', old: 'Blue · stable version', fresh: 'Green · new version',
    observer: 'Lambda Errors → CloudWatch → CodeDeploy',
    steps: [
      ['カナリア配信中、CodeDeploy が live の Lambda Errors アラームを監視しています。', '金丝雀阶段，CodeDeploy 监控 live 的 Lambda Errors 告警。', 'During the canary, CodeDeploy monitors the live Lambda Errors alarm.'],
      ['Lambda の未処理例外などで Errors メトリクスが発生した例。ここでは Green の障害を想定しています。', '模拟 Lambda 未处理异常等导致 Errors 指标增加，此处假设故障来自 Green。', 'An unhandled Lambda error contributes to Errors; this illustration assumes Green is the source.'],
      ['live の Errors が 60 秒で 1 件以上という設定に達して ALARM へ。CodeDeploy がアラームを検知して配信を停止。', 'live 的 Errors 达到 60 秒内至少 1 次的配置阈值，进入 ALARM；CodeDeploy 检测告警并停止发布。', 'The configured threshold of at least one live Error in 60 seconds is breached. The alarm enters ALARM and CodeDeploy stops deployment.'],
      ['デプロイ中のアラーム停止を契機に、CodeDeploy が安定版 Blue へ自動ロールバック。Green の流量を 0% にします。', '发布期间的告警触发停止，CodeDeploy 自动恢复 Blue 稳定版，Green 流量降为 0%。', 'The alarm stops the active deployment; CodeDeploy automatically restores stable Blue and removes Green traffic.'],
      ['ロールバック用デプロイの成功、live=Blue、追加重みなし、公開 API を確認。アラームの状態は評価期間に応じて後から更新されます。', '确认回滚部署成功、live=Blue、无附加权重并验证公网 API。告警状态会按评估周期随后更新。', 'Verify rollback success, live=Blue, no additional weights and public APIs. Alarm state updates separately according to its evaluation window.'],
    ] as Text[],
    boundary: ['このアラームと CodeDeploy のロールバック設定は構築済みですが、発火させた実環境での検証は未実施です。監視対象は live 全体で、Green 専用ではありません。デプロイ完了後の常時自動切り戻しを保証するものでもありません。', '此告警与 CodeDeploy 自动回滚配置已经存在，但实际触发告警的演练尚未完成。指标针对整个 live，不只针对 Green；也不代表部署结束后仍能持续自动回退。', 'The alarm and CodeDeploy rollback configuration exist, but alarm-triggered recovery has not been drilled. The metric covers all of live, not Green alone. It does not guarantee automatic rollback after a deployment has finished.'] as Text,
  },
];
