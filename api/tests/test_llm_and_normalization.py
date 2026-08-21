from core.llm_gateway import KeywordStubProvider, LLMGateway, _strip_clinical_leaks
from core.normalization import normalize_fields, normalize_term
from core.schema import CollectedFields, ExtractionDelta


def test_normalize_bukhar():
    cid, mapped = normalize_term("bukhar")
    assert mapped is True
    assert cid == "SYM_FEVER"


def test_unmapped_term_flagged():
    fields = CollectedFields(chief_complaint="strange-rash-xyz")
    out, review = normalize_fields(fields)
    assert "strange-rash-xyz" in review
    assert out.chief_complaint == "strange-rash-xyz"


def test_extraction_delta_strips_priority():
    delta = ExtractionDelta.model_validate({"fever": "true", "priority_flag": "HIGH", "diagnosis": "malaria"})
    dumped = delta.model_dump()
    assert "priority_flag" not in dumped
    assert "diagnosis" not in dumped


def test_stub_extracts_fever_duration():
    gw = LLMGateway(providers=[KeywordStubProvider()])
    delta = gw.extract("I have had bukhar for 3 days", CollectedFields(), "en")
    assert delta.chief_complaint == "SYM_FEVER"
    assert delta.duration_days == 3


def test_strip_diagnosis_leak():
    text = "You should take antibiotics. Patient reports fever."
    cleaned = _strip_clinical_leaks(text)
    assert "should take" not in cleaned.lower() or "[removed]" in cleaned
