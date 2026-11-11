package dev.kongortfolio.profile;

import java.util.List;

public record Profile(String name, String role, String introduction, List<Focus> focus,
                      List<Project> projects, List<Milestone> timeline,
                      List<Skill> skills, List<Qualification> qualifications, Note note) {
    public record Focus(String title, String description) {}
    public record Project(String kind, String title, String period, String role,
                          String description, String outcome, List<String> tags, String team,
                          List<String> responsibilities, List<Skill> environment) {}
    public record Milestone(String period, String title, String description) {}
    public record Skill(String title, List<String> items, String description) {}
    public record Qualification(String date, String name) {}
    public record Note(String date, String title, String summary, List<String> paragraphs) {}
}
