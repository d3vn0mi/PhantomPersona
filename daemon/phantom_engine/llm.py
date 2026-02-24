"""LLM engine for generating plausible noise content."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

import ollama as ollama_lib

from .config import LLMConfig

log = logging.getLogger(__name__)


@dataclass
class Persona:
    name: str
    age: int
    location: str
    occupation: str
    interests: list[str]
    personality_notes: str

    def summary(self) -> str:
        return (
            f"{self.name}, {self.age}, {self.occupation} in {self.location}. "
            f"Interests: {', '.join(self.interests)}. {self.personality_notes}"
        )


@dataclass
class BrowsingPlan:
    search_queries: list[str] = field(default_factory=list)
    urls_to_visit: list[str] = field(default_factory=list)
    products_to_browse: list[str] = field(default_factory=list)


class LLMEngine:
    def __init__(self, config: LLMConfig) -> None:
        self.config = config
        self._client = ollama_lib.Client(host=config.base_url)
        self._current_persona: Persona | None = None

    @property
    def persona(self) -> Persona | None:
        return self._current_persona

    def _chat(self, system: str, prompt: str) -> str:
        response = self._client.chat(
            model=self.config.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return response.message.content

    def generate_persona(self) -> Persona:
        system = (
            "You generate realistic fictional personas for privacy research. "
            "Respond ONLY with valid JSON matching this schema: "
            '{"name": str, "age": int, "location": str, "occupation": str, '
            '"interests": [str], "personality_notes": str}'
        )
        prompt = (
            "Generate a realistic, diverse persona for an American adult. "
            "Make the interests specific and varied (not generic). "
            "The persona should feel like a real person with quirky, "
            "non-obvious interest combinations."
        )
        raw = self._chat(system, prompt)
        # Strip markdown fences if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
        if raw.endswith("```"):
            raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        data = json.loads(raw)
        self._current_persona = Persona(**data)
        log.info("New persona: %s", self._current_persona.summary())
        return self._current_persona

    def generate_search_queries(self, count: int = 5) -> list[str]:
        if not self._current_persona:
            self.generate_persona()

        system = (
            "You generate realistic search engine queries that a specific person "
            "would type. Respond ONLY with a JSON array of strings. "
            "Make them natural — include typos, abbreviations, and varying "
            "specificity like real searches."
        )
        prompt = (
            f"Generate {count} Google search queries that this person would make:\n"
            f"{self._current_persona.summary()}\n\n"
            "Mix mundane daily searches with interest-specific ones."
        )
        raw = self._chat(system, prompt)
        raw = raw.strip().strip("`").strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()
        return json.loads(raw)

    def generate_browsing_plan(
        self, num_pages: int = 8, num_products: int = 3
    ) -> BrowsingPlan:
        if not self._current_persona:
            self.generate_persona()

        system = (
            "You generate realistic web browsing plans for privacy research. "
            "Respond ONLY with valid JSON: "
            '{"urls_to_visit": [str], "products_to_browse": [str]}. '
            "URLs should be real, popular websites. Products should be "
            "specific items with brand names someone would search on Amazon/etc."
        )
        prompt = (
            f"Generate a browsing plan for this person:\n"
            f"{self._current_persona.summary()}\n\n"
            f"Include {num_pages} URLs they'd visit and {num_products} "
            f"specific products they'd look at online."
        )
        raw = self._chat(system, prompt)
        raw = raw.strip().strip("`").strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()
        data = json.loads(raw)
        return BrowsingPlan(
            urls_to_visit=data.get("urls_to_visit", []),
            products_to_browse=data.get("products_to_browse", []),
        )

    def generate_form_data(self) -> dict[str, str]:
        if not self._current_persona:
            self.generate_persona()

        system = (
            "Generate realistic fake form data for a persona. "
            "Respond ONLY with JSON: "
            '{"first_name": str, "last_name": str, "email": str, '
            '"phone": str, "address": str, "city": str, "state": str, '
            '"zip": str, "company": str, "job_title": str}'
        )
        prompt = (
            f"Generate plausible (but fake) form fill data for:\n"
            f"{self._current_persona.summary()}"
        )
        raw = self._chat(system, prompt)
        raw = raw.strip().strip("`").strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()
        return json.loads(raw)
