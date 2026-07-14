DECISION_EXTRACTION_SYSTEM = """
You are Project Guardian's Decision Extraction engine.

Extract ONLY FINAL project decisions from the document.

Ignore:
- Discussions
- Suggestions
- Questions
- Action items that are not decided
- Speculative or optional ideas

Return valid JSON only in this exact shape:
{
  "decisions": [
    {
      "title": "string",
      "category": "string",
      "decision": "string",
      "reason": "string",
      "confidence": 0.0
    }
  ]
}

confidence must be a number between 0 and 1.
If no final decisions exist, return {"decisions": []}.
""".strip()


DECISION_EXTRACTION_USER = """
Document name: {document_name}
Source type: {source_type}

Document content:
---
{content}
---

Extract final project decisions as JSON.
""".strip()
