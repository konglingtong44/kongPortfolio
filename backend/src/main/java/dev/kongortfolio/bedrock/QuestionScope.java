package dev.kongortfolio.bedrock;

import java.util.List;

/** Optional examples for the UI; never used to accept, reject or route a visitor question. */
public final class QuestionScope {
    public static final String VERSION = "portfolio-semantic-v2";
    public record Choice(String id, String message) {}
    private record Example(String id, String ja, String zh, String en) {}
    private static final List<Example> EXAMPLES = List.of(
        new Example("introduction", "自己紹介をお願いします。", "请介绍一下你自己。", "Tell me about yourself."),
        new Example("career", "これまでの職務経験を教えてください。", "介绍一下你的工作经历。", "Summarize your work experience."),
        new Example("current-role", "現在の仕事と担当範囲を教えてください。", "你现在在做什么项目？", "What are your current responsibilities?"),
        new Example("skills", "得意な技術と技術スタックを教えてください。", "你擅长什么技术？", "What are your technical skills?"),
        new Example("education", "学歴を教えてください。", "介绍一下你的教育背景。", "What is your educational background?"),
        new Example("certifications", "取得資格と現在の状態を教えてください。", "你有哪些资格认证，目前是什么状态？", "What certifications have you obtained and what is their status?"),
        new Example("projects", "担当したプロジェクトと成果を教えてください。", "介绍一下你的项目经历。", "Describe your projects and contributions."),
        new Example("requirements", "要件定義では、どのように進めましたか。", "你是怎么做需求定义的？", "How do you approach requirements definition?"),
        new Example("aws-experience", "AWSに関する実務経験を教えてください。", "你有哪些 AWS 实务经验？", "What AWS experience do you have?"),
        new Example("pmo", "PMOとして何を担当しましたか。", "你在 PMO 工作中负责什么？", "What did you do in the PMO role?"),
        new Example("leadership", "サブリーダー経験とチームでの役割を教えてください。", "介绍你的团队管理经历和个人贡献。", "Describe your team leadership and individual contributions."),
        new Example("migration", "システム移行と基盤更改の経験を教えてください。", "介绍你的系统迁移和中间件更改经历。", "Describe your system and middleware migration experience."),
        new Example("salesforce-update", "Salesforce更新対応では何を担当しましたか。", "Salesforce 更新项目中你负责什么？", "What did you do in the Salesforce update project?"),
        new Example("java-experience", "JavaとSpringの実務経験を教えてください。", "你有哪些 Java 和 Spring 开发经验？", "Describe your Java and Spring experience."),
        new Example("frontend-experience", "フロントエンドとバージョンアップの経験を教えてください。", "你有哪些前端开发和版本升级经历？", "Describe your frontend and version upgrade experience."),
        new Example("portfolio", "このポートフォリオの構成と工夫を教えてください。", "介绍这个作品集的架构和部署方式。", "Explain your portfolio architecture and deployment choices."),
        new Example("motivation", "転職理由と今後の希望を教えてください。", "你为什么考虑转职？", "Why are you considering a career change?"),
        new Example("ai-experience", "AI関連の経験と学習状況を教えてください。", "你有哪些 AI 相关经历，目前在学习什么？", "What AI-related experience and study do you have?")
    );

    public static List<Choice> choices(String language) {
        return EXAMPLES.stream().map(e -> new Choice(e.id(), switch (language) {
            case "zh" -> e.zh(); case "en" -> e.en(); default -> e.ja();
        })).toList();
    }

    public static String refusal(String language) {
        return switch (language) {
            case "zh" -> "目前仅开放孔令通的经历、技能、项目、职业方向和工作方法相关问答。可以自然提问，例如询问需求定义、设计或项目中的具体工作；暂不提供无关闲聊、通用解题、代码生成或私人联系方式。";
            case "en" -> "I can answer questions about Kong's experience, skills, projects, career direction and ways of working. You can ask naturally, including about requirements, design or project responsibilities. Unrelated chat, general exercises, code generation and private contact details are not available.";
            default -> "孔令通の経歴・スキル・プロジェクト・キャリア・仕事の進め方について質問できます。要件定義や設計、担当した作業なども自然な言葉でご質問ください。無関係な雑談、一般的な問題解答、コード生成、個人の連絡先には対応していません。";
        };
    }

    private QuestionScope() {}
}
