package dev.kongortfolio.bedrock;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Exact reviewed questions, never keyword-based approval or model-based classification. */
public final class QuestionScope {
    public static final String VERSION = "portfolio-scope-v1";

    public record Choice(String id, String message) {}
    record Topic(String id, String prompt, Map<String, String> questions, List<String> aliases) {}

    private static Topic topic(String id, String prompt, String ja, String zh, String en, String... aliases) {
        return new Topic(id, prompt, Map.of("ja", ja, "zh", zh, "en", en), List.of(aliases));
    }

    private static final List<Topic> TOPICS = List.of(
        topic("introduction", "Introduce Kong using only the approved career facts.",
            "自己紹介をお願いします。", "请介绍一下你自己。", "Tell me about yourself.",
            "自己紹介", "孔令通さんについて教えて", "介绍一下你", "介绍一下孔令通", "你是谁", "自我介绍", "请自我介绍", "介绍一下自己", "Introduce yourself", "Who is Kong"),
        topic("career", "Summarize Kong's career in chronological order, distinguishing roles and dates.",
            "これまでの職務経験を教えてください。", "介绍一下你的工作经历。", "Summarize your work experience.",
            "これまでの職務経験を時系列で説明してください", "経歴を教えて", "你的工作经历是什么", "介绍一下你的职业经历", "What is your career background"),
        topic("current-role", "Describe Kong's current project and personal responsibilities, without inventing project authority.",
            "現在の仕事と担当範囲を教えてください。", "你现在在做什么项目？", "What are your current responsibilities?",
            "今は何の仕事をしていますか", "現在のプロジェクトは何ですか", "现在在做什么项目", "你目前负责什么", "What are you working on now"),
        topic("skills", "Describe Kong's documented technical skills without inventing proficiency or years per skill.",
            "得意な技術と技術スタックを教えてください。", "你擅长什么技术？", "What are your technical skills?",
            "技術スタックを教えて", "使用経験のある技術は何ですか", "你的技术栈是什么", "介绍你的技能", "你会哪些技术", "你擅长什么", "What is your tech stack"),
        topic("education", "Describe only Kong's documented education; do not invent a degree title.",
            "学歴を教えてください。", "介绍一下你的教育背景。", "What is your educational background?",
            "出身大学を教えて", "你毕业于哪里", "你的学历是什么", "Where did you study"),
        topic("certifications", "Explain Kong's recorded certification acquisition dates and renewal status. Never equate historical acquisition with current validity.",
            "取得資格と現在の状態を教えてください。", "你有哪些资格认证，目前是什么状态？", "What certifications have you obtained and what is their status?",
            "AWS認定は現在有効ですか", "PMPはいつ取得しましたか", "你现在持有有效的AWS SAP认证吗", "你有什么证书", "你有哪些证书", "你有PMP吗", "Are your AWS certifications currently valid"),
        topic("projects", "Summarize Kong's professional projects and personal responsibilities, separating team outcomes from individual achievements.",
            "担当したプロジェクトと成果を教えてください。", "介绍一下你的项目经历。", "Describe your projects and contributions.",
            "プロジェクト経験を教えて", "你做过哪些项目", "你在项目中做了什么", "What projects have you worked on"),
        topic("aws-experience", "Describe Kong's documented AWS implementation, migration and environment verification experience. Separate work experience, personal practice and study.",
            "AWSに関する実務経験を教えてください。", "你有哪些 AWS 实务经验？", "What AWS experience do you have?",
            "AWS移行では何を担当しましたか", "你做过哪些AWS迁移工作", "介绍你的AWS经验", "Describe your AWS migration experience"),
        topic("pmo", "Describe Kong's PMO duties, technical development support and release coordination; do not invent managerial authority.",
            "PMOとして何を担当しましたか。", "你在 PMO 工作中负责什么？", "What did you do in the PMO role?",
            "PMO経験を教えて", "PMOの仕事は事務作業だけでしたか", "你的PMO只是管理工作吗", "Was the PMO role purely administrative"),
        topic("leadership", "Describe Kong's subleader duties and personal contributions. Attribute team-wide deployment outcomes to the team.",
            "サブリーダー経験とチームでの役割を教えてください。", "介绍你的团队管理经历和个人贡献。", "Describe your team leadership and individual contributions.",
            "チーム管理経験を教えて", "30以上のサービスは全部一人で対応しましたか", "30多个服务都是你一个人改造的吗", "你有带团队的经验吗", "Did you deliver all 30 services alone"),
        topic("migration", "Describe Kong's documented application and middleware migration responsibilities, using only supplied project facts.",
            "システム移行と基盤更改の経験を教えてください。", "介绍你的系统迁移和中间件更改经历。", "Describe your system and middleware migration experience.",
            "TomcatからWildFlyへの移行では何を担当しましたか", "你做过Tomcat到WildFly迁移吗", "你有哪些基础设施经验"),
        topic("salesforce-update", "Describe Kong's existing Java-tool update for the Salesforce environment change, including packaging and deployment work actually documented.",
            "Salesforce更新対応では何を担当しましたか。", "Salesforce 更新项目中你负责什么？", "What did you do in the Salesforce update project?",
            "Javaツール改修の経験を教えて", "介绍你做过的Java Swing工具改修"),
        topic("java-experience", "Describe Kong's documented Java and Spring work experience; do not teach programming, produce code or solve exercises.",
            "JavaとSpringの実務経験を教えてください。", "你有哪些 Java 和 Spring 开发经验？", "Describe your Java and Spring experience.",
            "Javaの経験を教えて", "你做过Java开发吗", "介绍你的Java经验"),
        topic("frontend-experience", "Describe Kong's documented frontend work and Vue/Tableau upgrades, distinguishing employment projects from personal React practice.",
            "フロントエンドとバージョンアップの経験を教えてください。", "你有哪些前端开发和版本升级经历？", "Describe your frontend and version upgrade experience.",
            "Vueの移行経験を教えて", "Vue和Tableau的升级你做过什么", "你做过Vue升级吗"),
        topic("portfolio", "Explain only Kong's portfolio architecture and implemented deployment decisions. Distinguish deployed features from planned Bedrock work; do not give general tutorials or code.",
            "このポートフォリオの構成と工夫を教えてください。", "介绍这个作品集的架构和部署方式。", "Explain your portfolio architecture and deployment choices.",
            "このサイトの構成を教えて", "这个网站后端部署在ECS上吗知识库用什么", "这个网站的架构是什么", "请介绍你的项目架构", "这个网站是怎么部署的", "你为什么用Lambda不用ECS", "Why did you choose Lambda for your portfolio"),
        topic("motivation", "Explain Kong's career-change motivation and preferences only if established by the approved facts. Otherwise briefly say the reason has not been confirmed, without guessing dissatisfaction or salary motives.",
            "転職理由と今後の希望を教えてください。", "你为什么考虑转职？", "Why are you considering a career change?",
            "転職理由を教えて", "今後のキャリアの希望は何ですか", "你的转职原因是什么", "你为什么要转职是不是对公司不满意", "What are your career goals"),
        topic("ai-experience", "Summarize Kong's actual AI-related work tasks and current areas of study. Describe concrete investigations, development assistance and named technologies. Keep portfolio hosting details for the architecture topic.",
            "AI関連の経験と学習状況を教えてください。", "你有哪些 AI 相关经历，目前在学习什么？", "What AI-related experience and study do you have?",
            "本番AIサービスを単独で運用した経験がありますか", "你做过AI相关工作吗", "Describe your AI experience")
    );

    private static final Map<String, Topic> INDEX = buildIndex();

    private static Map<String, Topic> buildIndex() {
        Map<String, Topic> result = new HashMap<>();
        for (Topic topic : TOPICS) {
            for (String question : topic.questions().values()) add(result, question, topic);
            for (String alias : topic.aliases()) add(result, alias, topic);
        }
        return Map.copyOf(result);
    }

    private static void add(Map<String, Topic> index, String question, Topic topic) {
        Topic previous = index.putIfAbsent(normalize(question), topic);
        if (previous != null && !previous.id().equals(topic.id())) throw new IllegalStateException("Ambiguous reviewed question");
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT)
            .replaceAll("[\\p{P}\\p{Z}\\s]", "");
    }

    static Topic requireAllowed(String message, String language) {
        Topic topic = INDEX.get(normalize(message));
        if (topic == null) throw new OutsideScope(language);
        return topic;
    }

    public static List<Choice> choices(String language) {
        String selected = List.of("ja", "zh", "en").contains(language) ? language : "ja";
        return TOPICS.stream().map(t -> new Choice(t.id(), t.questions().get(selected))).toList();
    }

    public static String refusal(String language) {
        return switch (language) {
            case "zh" -> "目前仅开放孔令通的经历、技能、教育、资格、项目及职业方向相关问答。这个问法暂不支持，可以参考示例问题后再提问；暂不提供通用解题、代码生成或其他无关内容。";
            case "en" -> "This question is not currently supported. You can ask about Kong's experience, skills, education, qualifications, projects and career direction using an example question. General problem solving, code generation and unrelated requests are not available.";
            default -> "現在は孔令通の経歴・スキル・学歴・資格・プロジェクト・キャリアに関する所定の質問のみ受け付けています。この質問形式には未対応のため、質問例を参考に再度ご質問ください。一般的な問題解答・コード生成・無関係な依頼には対応していません。";
        };
    }

    public static final class OutsideScope extends RuntimeException {
        private final String language;
        public OutsideScope(String language) {
            super("OUT_OF_SCOPE");
            this.language = language;
        }
        public String answer() { return refusal(language); }
        public List<Choice> questions() { return choices(language); }
    }

    private QuestionScope() {}
}
