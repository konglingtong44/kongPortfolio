package dev.kongortfolio.bedrock;

import java.util.regex.Pattern;

/** Selects verbatim topic evidence from the already validated, immutable fact snapshot. */
final class QuestionFacts {
    private static final Pattern AI = Pattern.compile("(?i)(?<![a-z])AI(?![a-z])|ChatGPT|Copilot|Bedrock|LangChain|LangGraph|PoC");

    static String select(String topic, String approved) {
        if (!"ai-experience".equals(topic)) return approved;
        String section = "";
        String emittedSection = "";
        StringBuilder selected = new StringBuilder();
        for (String raw : approved.split("\\R")) {
            String line = raw.strip();
            if (line.startsWith("## ")) { section = line; continue; }
            if (section.isEmpty() || section.contains("資料の範囲") || section.contains("回答制約")
                || section.contains("資料にない") || line.isBlank()) continue;
            if (section.contains("個人開発")) {
                // Retain the study fact, not deployment notes or commentary about responsibilities.
                // The prefix remains a verbatim sentence from the pinned source, never a new fact.
                int end = line.indexOf('。');
                String sentence = end < 0 ? line : line.substring(0, end + 1);
                if (!sentence.contains("学習中") || !AI.matcher(sentence).find()) continue;
                line = sentence;
            } else if (!AI.matcher(line).find()) continue;
            if (!section.equals(emittedSection)) { selected.append(section).append('\n'); emittedSection = section; }
            selected.append(line).append('\n');
        }
        if (selected.isEmpty()) throw new ModelGateway.Failure(503, "FACTS_UNAVAILABLE");
        return selected.toString();
    }

    private QuestionFacts() {}
}
