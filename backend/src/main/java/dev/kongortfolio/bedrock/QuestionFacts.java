package dev.kongortfolio.bedrock;

/** Separates reference facts from old response-policy notes, without classifying visitor wording. */
final class QuestionFacts {
    static String forChat(String approved) {
        StringBuilder facts = new StringBuilder();
        boolean policy = false;
        boolean personal = false;
        for (String raw : approved.split("\\R")) {
            String line = raw.strip();
            if (line.startsWith("## ")) {
                policy = line.contains("資料の範囲") || line.contains("資料にない事項");
                personal = line.contains("個人開発");
            }
            if (policy || line.startsWith("Source:")) continue;
            // This fixed snapshot contains a superseded rollout note, not a career fact.
            // Exclude it for every question rather than letting it override the actual release.
            if (personal && (line.startsWith("Bedrock Q&Aは") || line.startsWith("以下は履歴書とは別に"))) continue;
            if (personal && line.contains("学習中。") && line.contains("責任") && line.contains("区別する")) {
                line = line.substring(0, line.indexOf("学習中。") + "学習中。".length());
            }
            facts.append(line).append('\n');
        }
        if (facts.toString().isBlank()) throw new ModelGateway.Failure(503, "FACTS_UNAVAILABLE");
        return facts.toString();
    }

    private QuestionFacts() {}
}
