package com.example.todo.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class RecurrenceRuleConverter implements AttributeConverter<RecurrenceRule, String> {

    @Override
    public String convertToDatabaseColumn(RecurrenceRule rule) {
        return rule != null ? rule.name() : null;
    }

    @Override
    public RecurrenceRule convertToEntityAttribute(String s) {
        return s != null ? RecurrenceRule.valueOf(s) : null;
    }
}
