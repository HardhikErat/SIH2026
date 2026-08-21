"""Golden regression suite — 14_AI_NLP_Architecture §8. Runs in CI before model/prompt changes."""

import json
from pathlib import Path

from core.llm_gateway import KeywordStubProvider, LLMGateway
from core.normalization import normalize_fields
from core.rule_engine import run_rule_engine
from core.schema import CollectedFields, PriorityFlag

FIXTURES = Path(__file__).parent / "golden" / "transcripts.json"


def test_golden_transcripts():
    cases = json.loads(FIXTURES.read_text(encoding="utf-8"))
    gw = LLMGateway(providers=[KeywordStubProvider()])
    for case in cases:
        fields = CollectedFields()
        history = []
        last_delta = {}
        for i, utterance in enumerate(case["utterances"]):
            delta = gw.extract(utterance, fields, case.get("language", "en"))
            last_delta = delta.model_dump(exclude_none=True)
            from core.schema import TurnRecord

            history.append(
                TurnRecord(
                    turn_id=f"g{i}",
                    speaker="patient",
                    text=utterance,
                    extracted_delta=last_delta,
                )
            )
            fields = fields.merge_delta(last_delta)
            fields, _ = normalize_fields(fields)
        result = run_rule_engine(fields, delta=last_delta, turn_history=history[:-1], current_turn_id="last")
        expected = case["expect"]
        if "chief_complaint" in expected:
            assert fields.chief_complaint == expected["chief_complaint"], case["id"]
        if "priority" in expected:
            assert result.priority_flag == PriorityFlag(expected["priority"]), case["id"]
        if "has_contradiction" in expected:
            assert bool(result.contradictions) == expected["has_contradiction"], case["id"]
        if "missing_contains" in expected:
            for field in expected["missing_contains"]:
                assert field in result.missing_fields, case["id"]
