"""Assemble LLM prompts from wizard answers and parse persona profiles."""

from __future__ import annotations

from app.schemas.persona import PersonaProfile, WizardAnswers
from app.services.llm import generate_json

PERSONA_PROMPT = """\
You are a privacy-tool assistant. Generate a detailed fictional persona that will \
be used to produce decoy internet activity, hiding a real user's digital footprint.

The persona must feel like a real, coherent human being — not random noise.

User preferences for this persona:
- Interests they want the phantom to have: {interests}
- Age range: {age_range}
- General location: {location}
- Profession: {profession}
- Shopping style: {shopping_style}

Return ONLY a valid JSON object (no markdown, no explanation) with these keys:
{{
  "name": "A plausible full name",
  "age": <integer>,
  "location": "City, State",
  "profession": "Their specific job title",
  "interests": ["list of 10-15 specific hobbies/interests"],
  "search_topics": ["20+ realistic Google searches this person would make"],
  "favorite_sites": ["10-15 real website URLs they would visit regularly"],
  "shopping_interests": ["10+ specific product categories or items they'd browse"],
  "personality_traits": ["5-7 traits that guide behavior generation"],
  "daily_routine": "A 2-3 sentence description of their typical day"
}}
"""


async def generate_persona(answers: WizardAnswers) -> PersonaProfile:
    """Take wizard answers, call the LLM, return a structured persona."""
    prompt = PERSONA_PROMPT.format(
        interests=", ".join(answers.interests),
        age_range=answers.age_range,
        location=answers.location,
        profession=answers.profession,
        shopping_style=answers.shopping_style,
    )
    data = await generate_json(prompt)
    return PersonaProfile(**data)
