# Prompt 1 — Decision Extraction

Extract only FINAL project decisions.

Ignore discussions, suggestions, and questions.

Return JSON:

```json
{
  "decisions": [
    {
      "title": "",
      "category": "",
      "decision": "",
      "reason": "",
      "confidence": 0.0
    }
  ]
}
```

Runtime copy used by the API: `backend/app/prompts/extraction.py`
